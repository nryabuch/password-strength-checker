# SIGNAL: Password Strength \& Breach Checker

A little tool that checks how strong your password is and whether it's shown up in any known data breaches. No backend, everything runs in the browser.

[Live demo](https://nryabuch.github.io/password-strength-checker/)

## What it does

* Scores your password's entropy (basically how random/guessable it is)
* Guesses how long itd take to crack
* Checks length, uppercase, lowercase, numbers, symbols, and whether its a common password
* Checks it against Have I Been Pwned to see if its been in a breach

## The interesting part

I didn't want to just send your password to some API to check it. Instead this uses something called k-anonymity:

1. Your password gets hashed (SHA-1) right in your browser
2. Only the first 5 characters of that hash get sent to the HIBP API
3. HIBP sends back a big list of hashes that start with those same 5 characters
4. Your browser checks locally if your full hash is anywhere in that list

So your actual password (or even your full hash) never leaves your computer. This is the same trick HIBP's own official tools use.

## Made with

&#x20;HTML, CSS, and JS.

## Running it

```bash
git clone https://github.com/<your-username>/password-strength-checker.git
cd password-strength-checker
python3 -m http.server 8080
```

Then go to `http://localhost:8080`. Or you can honestly just open `index.html` directly in a browser.

## Stuff I know is limited

* The common password list is tiny, just a demo. Could swap in a real wordlist later
* Crack time estimates assume a fast hash. If a real site uses bcrypt or something else thats slower, actual crack times would be way longer
* SHA-1 is only used because that's what the HIBP API requires, not because it's secure on its own

## Possible next steps

* Bigger wordlist
* Better pattern detection (like catching "qwerty123" type stuff)
* Debounce the input so it's not recalculating on literally every keystroke

