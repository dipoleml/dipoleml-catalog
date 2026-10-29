# Citadel fresh-clone onboarding proof

Source commit: `8c7b5102b75946767c62bf5a04fae13471b6e010`  
Result: **completed**
Total measured time: **28.17 seconds**

| Step | Status | Duration | Evidence |
|---|---|---:|---|
| fresh-clone | passed | 11111 ms | Local clone created from the committed source without shared hardlinks. |
| governed-plan | passed | 1725 ms | 61 file operations bound to sha256:35745d5a3759d8aaddcc4f79ab24b5ee1ed169349879aa73d7f72eb539262732. |
| exact-apply | passed | 13206 ms | Receipt recorded; confirmation token revalidated. |
| doctor-command-executed | passed | 1080 ms | Doctor command exited 0; semantic health unknown; owned footprint inspected. |
| first-do-route | passed | 300 ms | Plain request selected /review. |

## Claim boundary

This is an unattended, local, clean-clone installation and first-route proof on
Windows. It exercises governed planning, exact confirmation, adoption apply,
doctor, and proportional `/do` route preview against a new git repository. It
does not claim that a person completed the journey, that an external plugin UI
was clicked, or that a model performed repository work.

Report: `sha256:1f89b1d60d978a82e867a5c11839ab87f6482d4b16744dd48e045cb01f83800a`
