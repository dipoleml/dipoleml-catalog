# DTO Resources

Use plain PHP classes (DTOs) as API Platform resources instead of Doctrine entities for complete separation between your API contract and database schema.

## Why DTOs?

| Benefit | Description |
|---------|-------------|
| **API-First** | Design API independently from database |
| **No Doctrine Coupling** | Works with any data source |
| **Clean Contracts** | Input/output match API docs exactly |
| **Versioning** | Multiple API versions with different DTOs |
| **Security** | No accidental entity exposure |

## Basic DTO Resource

### Define the DTO

```php
<?php
// src/ApiResource/ProductResource.php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\State\ProductResourceProvider;
use App\State\ProductResourceProcessor;
use Symfony\Component\Validator\Constraints as Assert;

#[ApiResource(
    shortName: 'Product',
    operations: [
        new GetCollection(provider: ProductResourceProvider::class),
        new Get(provider: ProductResourceProvider::class),
        new Post(processor: ProductResourceProcessor::class),
    ],
)]
final class ProductResource
{
    public function __construct(
        #[ApiProperty(identifier: true)]
        public readonly ?int $id = null,

        #[Assert\NotBlank]
        #[Assert\Length(min: 3, max: 255)]
        public readonly ?string $name = null,

        #[Assert\Positive]
        public readonly ?int $priceInCents = null,

        public readonly ?string $formattedPrice = null,

        public readonly ?bool $inStock = null,
    ) {}
}
```

### State Provider

```php
<?php
// src/State/ProductResourceProvider.php

namespace App\State;

use ApiPlatform\Metadata\CollectionOperationInterface;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\ProductResource;
use App\Repository\ProductRepository;

final class ProductResourceProvider implements ProviderInterface
{
    public function __construct(
        private ProductRepository $repository,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): object|array|null
    {
        if ($operation instanceof CollectionOperationInterface) {
            return array_map(
                fn($p) => $this->toResource($p),
                $this->repository->findAll()
            );
        }

        $product = $this->repository->find($uriVariables['id']);
        return $product ? $this->toResource($product) : null;
    }

    private function toResource(object $product): ProductResource
    {
        return new ProductResource(
            id: $product->getId(),
            name: $product->getName(),
            priceInCents: $product->getPriceInCents(),
            formattedPrice: sprintf('$%.2f', $product->getPriceInCents() / 100),
            inStock: $product->getStock() > 0,
        );
    }
}
```

### State Processor

```php
<?php
// src/State/ProductResourceProcessor.php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\ApiResource\ProductResource;
use App\Entity\Product;
use Doctrine\ORM\EntityManagerInterface;

final class ProductResourceProcessor implements ProcessorInterface
{
    public function __construct(
        private EntityManagerInterface $em,
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): ProductResource
    {
        /** @var ProductResource $data */

        $product = new Product();
        $product->setName($data->name);
        $product->setPriceInCents($data->priceInCents);

        $this->em->persist($product);
        $this->em->flush();

        return new ProductResource(
            id: $product->getId(),
            name: $product->getName(),
            priceInCents: $product->getPriceInCents(),
            formattedPrice: sprintf('$%.2f', $product->getPriceInCents() / 100),
            inStock: $product->getStock() > 0,
        );
    }
}
```

## Separate Input/Output DTOs

### Output DTO

```php
<?php
// src/ApiResource/ProductOutput.php

namespace App\ApiResource;

final class ProductOutput
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,
        public readonly string $formattedPrice,
        public readonly bool $inStock,
        public readonly string $createdAt,
    ) {}
}
```

### Input DTO

```php
<?php
// src/ApiResource/ProductInput.php

namespace App\ApiResource;

use Symfony\Component\Validator\Constraints as Assert;

final class ProductInput
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(min: 3, max: 255)]
        public readonly string $name,

        #[Assert\Positive]
        public readonly int $priceInCents,

        #[Assert\PositiveOrZero]
        public readonly int $stock = 0,
    ) {}
}
```

### Resource with Separate DTOs

```php
#[ApiResource(
    shortName: 'Product',
    operations: [
        new GetCollection(
            output: ProductOutput::class,
            provider: ProductProvider::class,
        ),
        new Get(
            output: ProductOutput::class,
            provider: ProductProvider::class,
        ),
        new Post(
            input: ProductInput::class,
            output: ProductOutput::class,
            processor: ProductProcessor::class,
        ),
    ],
)]
final class ProductResource
{
    #[ApiProperty(identifier: true)]
    public ?int $id = null;
}
```

## Directory Structure

```
src/
├── ApiResource/          # DTO resources (API contract)
│   ├── ProductResource.php
│   ├── ProductInput.php
│   └── ProductOutput.php
├── Entity/               # Doctrine entities (internal)
│   └── Product.php
├── State/                # Providers & Processors
│   ├── ProductProvider.php
│   └── ProductProcessor.php
└── Repository/
    └── ProductRepository.php
```

## Configuration

```yaml
# config/packages/api_platform.yaml
api_platform:
    mapping:
        paths:
            - '%kernel.project_dir%/src/ApiResource'
```

## Best Practices

1. **Keep DTOs Immutable** - Use `readonly` properties
2. **Validate Input DTOs** - Symfony Validator constraints
3. **Computed Properties** - Add formatted fields in output
4. **Separate Concerns** - Input for validation, Output for presentation
5. **Test Transformations** - Unit test provider/processor logic

## Related Documentation

- [State Providers & Processors](state-providers-processors.md)
- [API Platform Overview](api-platform.md)
