const starField = document.getElementById("estrelas");

for (let i = 0; i < 95; i++) {
  const star = document.createElement("span");
  star.className = "star";

  const size = Math.random() * 2.6 + 0.8;
  star.style.width = `${size}px`;
  star.style.height = `${size}px`;
  star.style.left = `${Math.random() * 100}%`;
  star.style.top = `${Math.random() * 100}%`;
  star.style.setProperty("--speed", `${1.5 + Math.random() * 3.5}s`);

  starField.appendChild(star);
}

document.getElementById("comecar").addEventListener("click", () => {
  document.querySelector(".intro").scrollIntoView({ behavior: "smooth" });
});

const revealItems = document.querySelectorAll(".reveal, .reveal-left, .reveal-right");

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });

revealItems.forEach((item) => observer.observe(item));

const proposal = document.getElementById("pedido");
const surpriseButton = document.getElementById("surpresa");
const yesButton = document.getElementById("sim");
const talkButton = document.getElementById("pessoalmente");
const celebration = document.getElementById("celebracao");

surpriseButton.addEventListener("click", () => {
  proposal.classList.add("show");
  proposal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
});

yesButton.addEventListener("click", () => {
  proposal.classList.remove("show");
  proposal.setAttribute("aria-hidden", "true");

  celebration.classList.add("show");
  celebration.setAttribute("aria-hidden", "false");

  criarCoracoes();
});

talkButton.addEventListener("click", () => {
  talkButton.textContent = "Tudo bem 💙";
  talkButton.disabled = true;
  talkButton.style.opacity = ".75";
});

function criarCoracoes() {
  const emojis = ["💜", "💙", "✨"];

  for (let i = 0; i < 55; i++) {
    setTimeout(() => {
      const heart = document.createElement("span");
      heart.className = "confetti-heart";
      heart.textContent = emojis[Math.floor(Math.random() * emojis.length)];

      heart.style.left = `${Math.random() * 100}vw`;
      heart.style.fontSize = `${16 + Math.random() * 20}px`;
      heart.style.animationDuration = `${2.8 + Math.random() * 3.5}s`;

      document.body.appendChild(heart);

      setTimeout(() => heart.remove(), 7000);
    }, i * 55);
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && proposal.classList.contains("show")) {
    proposal.classList.remove("show");
    proposal.setAttribute("aria-hidden", "true");
    proposal.setAttribute("aria-hidden", "true");
  }
});