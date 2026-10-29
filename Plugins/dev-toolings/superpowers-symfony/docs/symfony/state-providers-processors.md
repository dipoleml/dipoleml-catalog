# State Providers & Processors

State Providers and Processors are the backbone of API Platform's data layer. They enable complete decoupling between your API and the underlying data sources.

## Overview

| Component | Purpose | HTTP Methods |
|-----------|---------|--------------|
| **State Provider** | Retrieves data | GET |
| **State Processor** | Persists/modifies data | POST, PUT, PATCH, DELETE |

## State Providers

### When to Use

- Custom data transformation before output
- Non-Doctrine data sources (external APIs, cache, files)
- Complex queries not supported by filters
- Multi-source aggregation

### Basic Implementation

```php
<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Product;
use App\Repository\ProductRepository;

/**
 * @implements ProviderInterface<Product>
 */
final class ProductProvider implements ProviderInterface
{
    public function __construct(
        private ProductRepository $repository,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        if (isset($uriVariables['id'])) {
            return $this->repository->find($uriVariables['id']);
        }

        return $this->repository->findAll();
    }
}
```

### Decorating Built-in Providers

```php
<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class AuditedProductProvider implements ProviderInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.item_provider')]
        private ProviderInterface $itemProvider,
        #[Autowire(service: 'api_platform.doctrine.orm.state.collection_provider')]
        private ProviderInterface $collectionProvider,
        private AuditLogger $auditLogger,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        $isItem = isset($uriVariables['id']);
        $provider = $isItem ? $this->itemProvider : $this->collectionProvider;

        $result = $provider->provide($operation, $uriVariables, $context);

        $this->auditLogger->log('product_accessed', [
            'operation' => $operation->getName(),
            'item' => $isItem,
        ]);

        return $result;
    }
}
```

### Provider with DTO Output

```php
<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use ApiPlatform\State\Pagination\TraversablePaginator;
use App\Dto\ProductOutput;
use App\Entity\Product;

final class ProductOutputProvider implements ProviderInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.item_provider')]
        private ProviderInterface $itemProvider,
        #[Autowire(service: 'api_platform.doctrine.orm.state.collection_provider')]
        private ProviderInterface $collectionProvider,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|iterable|null
    {
        if (isset($uriVariables['id'])) {
            $product = $this->itemProvider->provide($operation, $uriVariables, $context);
            return $product ? $this->transform($product) : null;
        }

        $paginator = $this->collectionProvider->provide($operation, $uriVariables, $context);

        if ($paginator instanceof TraversablePaginator) {
            $items = array_map(fn($p) => $this->transform($p), iterator_to_array($paginator));

            return new TraversablePaginator(
                new \ArrayIterator($items),
                $paginator->getCurrentPage(),
                $paginator->getItemsPerPage(),
                $paginator->getTotalItems(),
            );
        }

        return array_map(fn($p) => $this->transform($p), iterator_to_array($paginator));
    }

    private function transform(Product $product): ProductOutput
    {
        return new ProductOutput(
            id: $product->getId(),
            name: $product->getName(),
            formattedPrice: sprintf('$%.2f', $product->getPriceInCents() / 100),
            inStock: $product->getStock() > 0,
        );
    }
}
```

## State Processors

### When to Use

- Custom persistence logic
- Input DTO transformation to entities
- Side effects (events, notifications, cache invalidation)
- External system synchronization

### Basic Implementation

```php
<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\Metadata\DeleteOperationInterface;
use ApiPlatform\State\ProcessorInterface;
use Doctrine\ORM\EntityManagerInterface;

final class ProductProcessor implements ProcessorInterface
{
    public function __construct(
        private EntityManagerInterface $em,
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($operation instanceof DeleteOperationInterface) {
            $this->em->remove($data);
            $this->em->flush();
            return null;
        }

        $this->em->persist($data);
        $this->em->flush();

        return $data;
    }
}
```

### Processor with Input DTO

```php
<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Dto\CreateProductInput;
use App\Entity\Product;
use Doctrine\ORM\EntityManagerInterface;

final class CreateProductProcessor implements ProcessorInterface
{
    public function __construct(
        private EntityManagerInterface $em,
        private SlugGenerator $slugGenerator,
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): Product
    {
        /** @var CreateProductInput $data */

        $product = new Product();
        $product->setName($data->name);
        $product->setSlug($this->slugGenerator->generate($data->name));
        $product->setDescription($data->description);
        $product->setPriceInCents($data->priceInCents);

        $this->em->persist($product);
        $this->em->flush();

        return $product;
    }
}
```

### Decorating Built-in Processors

```php
<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Event\ProductCreatedEvent;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\EventDispatcher\EventDispatcherInterface;

final class EventDispatchingProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        #[Autowire(service: 'api_platform.doctrine.orm.state.remove_processor')]
        private ProcessorInterface $removeProcessor,
        private EventDispatcherInterface $dispatcher,
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        $isDelete = str_contains(strtolower($operation->getName() ?? ''), 'delete');

        if ($isDelete) {
            return $this->removeProcessor->process($data, $operation, $uriVariables, $context);
        }

        $result = $this->persistProcessor->process($data, $operation, $uriVariables, $context);

        $this->dispatcher->dispatch(new ProductCreatedEvent($result));

        return $result;
    }
}
```

## Registering Providers/Processors

### In Resource Configuration

```php
#[ApiResource(
    operations: [
        new Get(provider: ProductOutputProvider::class),
        new GetCollection(provider: ProductOutputProvider::class),
        new Post(
            input: CreateProductInput::class,
            processor: CreateProductProcessor::class,
        ),
    ],
)]
class Product { /* ... */ }
```

### As Tagged Services (Global)

```yaml
# config/services.yaml
services:
    App\State\AuditedProductProvider:
        tags:
            - { name: 'api_platform.state_provider', priority: -100 }
```

## Built-in Services

| Service ID | Purpose |
|------------|---------|
| `api_platform.doctrine.orm.state.item_provider` | Fetch single Doctrine entity |
| `api_platform.doctrine.orm.state.collection_provider` | Fetch Doctrine collection |
| `api_platform.doctrine.orm.state.persist_processor` | Persist Doctrine entity |
| `api_platform.doctrine.orm.state.remove_processor` | Remove Doctrine entity |

## Best Practices

1. **Single Responsibility**: One provider/processor per concern
2. **Decorate, Don't Replace**: Extend built-in services
3. **Use DTOs**: Keep API contracts separate from entities
4. **Type Safety**: Use generics in `@implements`
5. **Events**: Dispatch events for side effects
6. **Testing**: Unit test transformation logic

## Related Documentation

- [DTO Resources](dto-resources.md)
- [API Platform Overview](api-platform.md)
