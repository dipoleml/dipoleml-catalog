# VHS tape — animated README hero.
#
# Render with:
#   brew install charmbracelet/tap/vhs
#   vhs docs/demo.tape -o website/public/demo.gif
#
# Committed GIF path: website/public/demo.gif
# Swapped into the README hero above the `<img src="designlang.png" />` line.

Output website/public/demo.gif

Set FontSize 16
Set Width 1200
Set Height 680
Set Padding 24
Set TypingSpeed 45ms
Set Theme "Catppuccin Mocha"
Set Shell "zsh"

# Prompt
Type "npx designlang https://stripe.com"
Sleep 600ms
Enter

# Let the real output stream
Sleep 11s

# Highlight: show the two files that matter most
Type "cat stripe-com-design-tokens.json | jq '.semantic.color.action' | head -20"
Sleep 400ms
Enter
Sleep 3s

Type "clear"
Enter
Sleep 400ms

Type "# Now score it"
Sleep 500ms
Enter
Type "npx designlang score https://stripe.com"
Sleep 300ms
Enter
Sleep 9s

# Leave the score on screen
Sleep 2s
