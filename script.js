// just a small sample list of super common passwords for the "not a common password" check.
// if you want to make this way more thorough, swap this out for a real wordlist like the
// rockyou.txt top 10k, there's a link to one in the readme
const COMMON_PASSWORDS = new Set([
  "123456", "123456789", "password", "12345678", "qwerty", "111111",
  "123123", "1234567890", "1234567", "password1", "12345", "iloveyou",
  "1q2w3e4r", "qwertyuiop", "admin", "letmein", "welcome", "monkey",
  "abc123", "dragon", "master", "sunshine", "princess", "football"
]);

// grabbing every element we need up front so we're not calling getElementById a hundred times later
const els = {
  input: document.getElementById("pw-input"),
  toggleBtn: document.getElementById("toggle-visibility"),
  meterSegments: document.getElementById("meter-segments"),
  entropyValue: document.getElementById("entropy-value"),
  verdict: document.getElementById("verdict"),
  crackTime: document.getElementById("crack-time"),
  checklist: document.getElementById("checklist"),
  breachBtn: document.getElementById("breach-btn"),
  breachResult: document.getElementById("breach-result"),
};

const SEGMENT_COUNT = 10;

// building the 10 little bars for the meter once when the page loads, instead of hardcoding
// them in the html. easier to change SEGMENT_COUNT later if you want more or fewer bars
for (let i = 0; i < SEGMENT_COUNT; i++) {
  const seg = document.createElement("div");
  seg.className = "meter__seg";
  els.meterSegments.appendChild(seg);
}
const segments = Array.from(els.meterSegments.children);

// this is the actual entropy math. basically: how many different characters could show up
// at each position (charsetSize), times how many positions there are (password.length),
// converted into bits with log2. more variety and more length both push this number up
function calcEntropy(password) {
  if (!password) return 0;
  let charsetSize = 0;
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32; // rough estimate for common symbols
  if (charsetSize === 0) return 0;
  return password.length * Math.log2(charsetSize);
}

// turns the entropy number into a human readable "how long would this take to crack" string.
// assumes an attacker can try 10 billion guesses a second, which is a conservative benchmark
// for an offline attack against a fast hash. see the explainer panel on the site for more on this
function formatCrackTime(entropyBits) {
  const guessesPerSecond = 1e10;
  const combinations = Math.pow(2, entropyBits); // total possible passwords for this entropy
  const seconds = combinations / guessesPerSecond / 2; // divide by 2 for the average case, not worst case

  if (seconds < 1) return "instantly";

  // walk down from centuries to seconds and stop at the first unit that fits
  const units = [
    ["century", 60 * 60 * 24 * 365 * 100],
    ["year", 60 * 60 * 24 * 365],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [name, unitSeconds] of units) {
    const value = seconds / unitSeconds;
    if (value >= 1) {
      const rounded = value > 1000 ? Math.round(value).toLocaleString() : value.toFixed(1);
      return `~${rounded} ${name}${value >= 2 ? "s" : ""}`;
    }
  }
  return "instantly";
}

// keeping track of which checks were passing last time, so we know when one just flipped
// from false to true and can trigger the little pop animation only on that transition
const previousChecks = {};

function updateChecklist(password) {
  const checks = {
    length: password.length >= 12,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
    symbol: /[^a-zA-Z0-9]/.test(password),
    common: password.length > 0 && !COMMON_PASSWORDS.has(password.toLowerCase()),
  };

  for (const [key, passed] of Object.entries(checks)) {
    const el = els.checklist.querySelector(`[data-check="${key}"]`);
    const justPassed = passed && !previousChecks[key];

    el.classList.toggle("pass", passed);
    el.classList.toggle("just-passed", justPassed);
    el.querySelector(".check__mark").textContent = passed ? "●" : "○";

    if (justPassed) {
      // remove the animation class after it plays so it's ready to fire again later
      // (like if you delete a character and then retype it)
      setTimeout(() => el.classList.remove("just-passed"), 400);
    }
  }

  Object.assign(previousChecks, checks);
  return checks;
}

// lights up the segmented meter bar by bar, and also updates the glowing halo behind
// the whole panel to match, so the color feedback is consistent everywhere on the page
function updateMeter(entropyBits, isCommon) {
  // capping the visual scale at 100 bits just so the bar doesn't feel "maxed out" too easily
  const pct = Math.min(entropyBits / 100, 1);
  const filled = isCommon ? 1 : Math.round(pct * SEGMENT_COUNT);

  let color = "var(--alert)";
  if (!isCommon) {
    if (entropyBits >= 70) color = "var(--safe)";
    else if (entropyBits >= 40) color = "var(--caution)";
  }

  segments.forEach((seg, i) => {
    const isLit = i < filled;
    // staggering the transition delay per segment so they light up one after another,
    // like an old vu meter powering on, instead of all snapping at once
    seg.style.transitionDelay = isLit ? `${i * 25}ms` : "0ms";
    seg.style.background = isLit ? color : "var(--line)";
    seg.style.boxShadow = isLit ? `0 0 8px ${color}` : "none";
    seg.classList.toggle("lit", isLit);
  });

  // this line is what makes the ambient glow behind the whole panel change color,
  // it just sets a css variable that the .console::before rule in style.css reads
  document.querySelector(".console").style.setProperty("--glow-color", color);

  return color;
}

// picks the one word verdict (weak/moderate/strong) and its color based on entropy
function updateVerdict(entropyBits, isCommon) {
  if (isCommon) {
    els.verdict.textContent = "critical, common password";
    els.verdict.style.color = "var(--alert)";
    return;
  }
  if (entropyBits === 0) {
    els.verdict.textContent = "awaiting input";
    els.verdict.style.color = "var(--dim)";
  } else if (entropyBits < 40) {
    els.verdict.textContent = "weak";
    els.verdict.style.color = "var(--alert)";
  } else if (entropyBits < 70) {
    els.verdict.textContent = "moderate";
    els.verdict.style.color = "var(--caution)";
  } else {
    els.verdict.textContent = "strong";
    els.verdict.style.color = "var(--safe)";
  }
}

// these two variables track the number currently animating on screen, so if you keep typing
// fast we can smoothly animate from wherever we currently are to the new target, instead of
// the number just jumping around
let displayedEntropy = 0;
let entropyAnimFrame = null;

function animateEntropyTo(target, hasPassword) {
  cancelAnimationFrame(entropyAnimFrame); // stop any animation already in progress
  const start = displayedEntropy;
  const startTime = performance.now();
  const duration = 220;

  function tick(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3); // ease out, starts fast then settles
    displayedEntropy = start + (target - start) * eased;
    els.entropyValue.textContent = hasPassword ? `${displayedEntropy.toFixed(1)} bits` : "- bits";
    if (t < 1) entropyAnimFrame = requestAnimationFrame(tick);
  }
  entropyAnimFrame = requestAnimationFrame(tick);
}

// this runs on every single keystroke in the password field. it's the main function that
// ties everything together: recalculates entropy, updates the meter, checklist, verdict,
// crack time, and resets the breach button since the password just changed
function handleInput() {
  const password = els.input.value;
  const isCommon = password.length > 0 && COMMON_PASSWORDS.has(password.toLowerCase());
  const entropyBits = calcEntropy(password);

  updateChecklist(password);
  updateMeter(entropyBits, isCommon);
  updateVerdict(entropyBits, isCommon);
  animateEntropyTo(entropyBits, password.length > 0);

  els.crackTime.textContent = password ? formatCrackTime(entropyBits) : "-";

  // reset the breach button and result every time you type, since the old result
  // no longer applies to whatever you've now typed
  els.breachBtn.disabled = password.length === 0;
  els.breachResult.textContent = "";
  els.breachResult.className = "breach-result";
}

els.input.addEventListener("input", handleInput);

// toggles the password field between hidden dots and visible plain text
els.toggleBtn.addEventListener("click", () => {
  const isPassword = els.input.type === "password";
  els.input.type = isPassword ? "text" : "password";
  els.toggleBtn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
});

// ===== this is the important part: checking against Have I Been Pwned without ever sending
// the actual password anywhere. see the "how it works" panel on the site for the full explanation,
// but the short version is: hash locally, send only the first 5 characters of the hash, and match
// the rest of it against the results locally in the browser =====

// hashes the password with sha1 using the browser's built in crypto api. this never touches
// the network, it all happens right here on the user's machine
async function sha1(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

// this is the actual k-anonymity check. only the 5 character prefix ever leaves the browser
async function checkBreach(password) {
  const fullHash = await sha1(password);
  const prefix = fullHash.slice(0, 5);
  const suffix = fullHash.slice(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  if (!response.ok) throw new Error("HIBP request failed");

  const text = await response.text();
  const lines = text.split("\n");

  // hibp sends back a big list of "suffix:count" pairs that all share our prefix.
  // we're just checking locally if our specific suffix shows up anywhere in that list
  for (const line of lines) {
    const [hashSuffix, count] = line.trim().split(":");
    if (hashSuffix === suffix) {
      return parseInt(count, 10); // found it, this is how many times it's shown up in breaches
    }
  }
  return 0; // never showed up, not found in any known breach
}

els.breachBtn.addEventListener("click", async () => {
  const password = els.input.value;
  if (!password) return;

  els.breachBtn.disabled = true;
  els.breachResult.innerHTML = '<span class="radar-spin"></span> querying HIBP range API...';
  els.breachResult.className = "breach-result pending";

  try {
    const count = await checkBreach(password);
    if (count > 0) {
      els.breachResult.textContent = `found in ${count.toLocaleString()} known breaches. don't use this password`;
      els.breachResult.className = "breach-result breached";
    } else {
      els.breachResult.textContent = "not found in any known breach";
      els.breachResult.className = "breach-result safe";
    }
  } catch (err) {
    els.breachResult.textContent = "couldn't reach HIBP. check your connection and try again";
    els.breachResult.className = "breach-result breached";
  } finally {
    els.breachBtn.disabled = false;
  }
});

// runs once on page load so the ui starts in the right empty state
handleInput();
