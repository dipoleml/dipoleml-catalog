# English tickets and baseline predictions

Thirty independent evaluation tickets; three permutations do not create additional samples.
The expected labels below are evaluator-only. Jev and LLM results are pending because the English fit probe
failed to connect. No earlier Chinese-language predictions are presented as English results.

| ID | Title | Expected queue | Random correct / 3 | Rule correct / 3 |
|---|---|---|---:|---:|
| t_52586863f51e | Delivery stalled | logistics | 1 | 3 |
| t_6cb98186dde0 | Change the delivery address | logistics | 1 | 3 |
| t_8f0ec563a91a | Only check delivery | logistics | 1 | 0 |
| t_a5a229edd810 | Track the new order | logistics | 1 | 0 |
| t_e4351833c8c8 | Delivery screenshot | logistics | 0 | 0 |
| t_97415027853c | Ask for delivery now | logistics | 0 | 0 |
| t_07772aa5f822 | Two charges | payment | 1 | 3 |
| t_1a6847ba8b66 | Payment error | payment | 0 | 3 |
| t_609c2a02ab84 | Check the payment | payment | 1 | 0 |
| t_c8fd45b69015 | Payment needs checking | payment | 1 | 0 |
| t_c85ca34669b1 | Transaction status | payment | 2 | 3 |
| t_ace2461b953a | Wallet charged twice | payment | 1 | 0 |
| t_afe6633569aa | Exchange the size | returns | 1 | 3 |
| t_273060d164f5 | Cancel the purchase | returns | 0 | 3 |
| t_f21a8be4a071 | Refund requested | returns | 0 | 0 |
| t_2ff652a83e3b | Return after payment | returns | 0 | 0 |
| t_ec027c12e4da | Refund the duplicate charge | returns | 0 | 0 |
| t_6892a5546a24 | Do not want to keep the item | returns | 1 | 0 |
| t_55ac1dd8d045 | Forgotten password | account | 0 | 3 |
| t_f5251390fb88 | Login verification code | account | 2 | 3 |
| t_507d761b520a | Access restricted | account | 1 | 0 |
| t_46f559df489a | Restore account access | account | 0 | 0 |
| t_9f4c2e9e9fc4 | Login on a new phone | account | 0 | 3 |
| t_5b12b66a4428 | Cannot access my profile | account | 0 | 3 |
| t_892cab266e67 | Problems with two orders | human | 0 | 3 |
| t_d6e0fd840d60 | Two independent problems | human | 0 | 3 |
| t_fac102ef66cc | Unclear order issue | human | 1 | 3 |
| t_c5314933eb53 | Missing details | human | 1 | 3 |
| t_c72f978e4f83 | Human help with payment | human | 0 | 3 |
| t_30a6dedb9828 | Human help with account | human | 0 | 3 |

## t_52586863f51e: Delivery stalled

My parcel has been sitting at the same sorting center. Please investigate the delivery problem.

Expected queue: `logistics`. Scenario: ordinary.
Order status: `shipped`.

## t_6cb98186dde0: Change the delivery address

I have moved. Please contact the courier to redirect this order to my new address.

Expected queue: `logistics`. Scenario: ordinary.
Order status: `shipped`.

## t_8f0ec563a91a: Only check delivery

I am not requesting a return or a refund. I only want to know when it will be delivered.

Expected queue: `logistics`. Scenario: negation.
Order status: `shipped`.

## t_a5a229edd810: Track the new order

The duplicate charge on my previous order has been resolved. Today I only want the current location of this parcel.

Expected queue: `logistics`. Scenario: background.
Order status: `shipped`.

## t_e4351833c8c8: Delivery screenshot

A friend suggested a refund, but I do not want that. Please first check why my parcel is marked as delivered.

Expected queue: `logistics`. Scenario: quoted background.
Order status: `delivered`.

## t_97415027853c: Ask for delivery now

If it still has not arrived next week, I will request a return. Right now I only want you to speed up delivery.

Expected queue: `logistics`. Scenario: conditional.
Order status: `shipped`.

## t_07772aa5f822: Two charges

I was charged twice for the same order. Please check the payment records and explain the duplicate charge.

Expected queue: `payment`. Scenario: ordinary.
Order status: `paid`.

## t_1a6847ba8b66: Payment error

After I click pay, bank card verification fails and I cannot complete the payment.

Expected queue: `payment`. Scenario: ordinary.
Order status: `unpaid`.

## t_609c2a02ab84: Check the payment

I am not asking for a refund or a return. I need to find out why the payment failed.

Expected queue: `payment`. Scenario: negation.
Order status: `unpaid`.

## t_c8fd45b69015: Payment needs checking

I can log in to my account again, but checkout now keeps saying the charge failed. Please check the payment.

Expected queue: `payment`. Scenario: background.
Order status: `unpaid`.

## t_c85ca34669b1: Transaction status

My bank shows a charge, but the order is still marked unpaid. Please verify whether this transaction succeeded.

Expected queue: `payment`. Scenario: status mismatch.
Order status: `unpaid`.

## t_ace2461b953a: Wallet charged twice

The delivery inquiry is finished. This time I only want to know why my wallet was charged twice.

Expected queue: `payment`. Scenario: background.
Order status: `delivered`.

## t_afe6633569aa: Exchange the size

The shoes I received are too small. Please exchange them for a larger size.

Expected queue: `returns`. Scenario: ordinary.
Order status: `delivered`.

## t_273060d164f5: Cancel the purchase

I no longer need this item. I want to cancel the purchase and get my money back.

Expected queue: `returns`. Scenario: ordinary.
Order status: `paid`.

## t_f21a8be4a071: Refund requested

There is no need to chase delivery anymore. I want a refund now.

Expected queue: `returns`. Scenario: negation.
Order status: `shipped`.

## t_2ff652a83e3b: Return after payment

Payment succeeded and I can log in to my account, but the item arrived damaged and I want to return it.

Expected queue: `returns`. Scenario: background.
Order status: `delivered`.

## t_ec027c12e4da: Refund the duplicate charge

I was charged twice for one order. I explicitly want a refund of the extra charge.

Expected queue: `returns`. Scenario: explicit intent.
Order status: `paid`.

## t_6892a5546a24: Do not want to keep the item

I want to send this item back to the seller and get my money back. I do not need parcel tracking.

Expected queue: `returns`. Scenario: paraphrase.
Order status: `delivered`.

## t_55ac1dd8d045: Forgotten password

I forgot my password and cannot log in. Please help me recover my account.

Expected queue: `account`. Scenario: ordinary.

## t_f5251390fb88: Login verification code

The login verification code never arrives, so I cannot access my account.

Expected queue: `account`. Scenario: ordinary.

## t_507d761b520a: Access restricted

This is not a payment problem. I cannot even get into my account and need access restored.

Expected queue: `account`. Scenario: negation.

## t_46f559df489a: Restore account access

The return process is finished. I now only need the login restriction removed from my account.

Expected queue: `account`. Scenario: background.
Order status: `returned`.

## t_9f4c2e9e9fc4: Login on a new phone

My old phone no longer works. The new device keeps reporting account verification failure. Please restore my login.

Expected queue: `account`. Scenario: ordinary.

## t_5b12b66a4428: Cannot access my profile

I want to view orders in my profile, but the system keeps signing me out. Please fix my account access.

Expected queue: `account`. Scenario: paraphrase.

## t_892cab266e67: Problems with two orders

Please check delivery progress for order one and request a refund for order two. I need both done.

Expected queue: `human`. Scenario: multiple intents.

## t_d6e0fd840d60: Two independent problems

I need help because I cannot log in to my account. Separately, please check the duplicate charge on another order.

Expected queue: `human`. Scenario: multiple intents.

## t_fac102ef66cc: Unclear order issue

Something about this order looks wrong, but I do not know what it is.

Expected queue: `human`. Scenario: insufficient.

## t_c5314933eb53: Missing details

Please deal with the matter I mentioned yesterday.

Expected queue: `human`. Scenario: insufficient.

## t_c72f978e4f83: Human help with payment

The payment failed again. This time I want a human support agent to handle it directly.

Expected queue: `human`. Scenario: explicit human.
Order status: `unpaid`.

## t_30a6dedb9828: Human help with account

I do not want to continue automated account recovery. Please transfer me to a real person.

Expected queue: `human`. Scenario: explicit human.

## Separate fit probe

| ID | Title | Description | Expected queue |
|---|---|---|---|
| P001 | Check delivery progress | My parcel tracking has not updated for three days. Please find out where it is now. | logistics |
| P002 | Only check the parcel | I do not want a refund or a return. I only want to know where my parcel is. | logistics |
| P003 | Payment did not go through | Checkout says the payment failed, and the item is still in my cart. Please help me pay. | payment |
| P004 | Check a duplicate charge | The earlier delivery issue is resolved. Today I noticed two charges on my bank card. Please check the charges. | payment |
| P005 | Request a return | The clothes are the wrong size. I want to return them for a refund. | returns |
| P006 | Request a refund now | There is no need to track the parcel anymore. I have decided to cancel the purchase and request a refund. | returns |
| P007 | Login failed | My password keeps being rejected, and I cannot log in to my account. | account |
| P008 | Account access | The payment succeeded, but I cannot log in now. Please restore access to my account. | account |
| P009 | Two separate requests | Please check delivery for order A and arrange a return for order B. | human |
| P010 | Need help | There is a problem with my order. Please sort it out. | human |
| P011 | Speak to a human | I know parcel tracking can be checked automatically, but please transfer me directly to a human support agent. | human |
| P012 | Unclear problem | It is neither a payment issue nor a delivery issue. I cannot explain what is wrong yet. | human |

See [validation.json](validation.json) for the exact per-seed predictions and dataset fingerprints.
