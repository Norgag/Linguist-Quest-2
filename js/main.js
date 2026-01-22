import { questionData } from "./questions.js";
import { audio } from "./audio.js";

/* =====================
   GAME STATE
===================== */
let questionPool = [];
let currentQuestion = null;
let monsterHealth = 0;
let monsterMaxHealth = 0; 
let currentMonster = 0;

let playerMaxHealth = 100;
let playerHealth = 100;

let inputLocked = false;
let currentLanguage = "";

const GROQ_API_KEY = "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";
const GROQ_MODELS = ["llama3-8b-8192", "mixtral-8x7b-32768", "gemma2-9b-it"];

/* =====================
   ELEMENTS
===================== */
const el = {
    home: document.getElementById("home-screen"),
    battle: document.getElementById("battle-screen"),
    monster: document.getElementById("monster"),
    player: document.getElementById("player"),
    monsterHp: document.getElementById("monster-hp"),
    playerHp: document.getElementById("player-hp"),
    question: document.getElementById("question-text"),
    options: document.getElementById("options-container"),
    dialogue: document.getElementById("dialogue-box"),
    homeMusic: document.getElementById("homeMusic"),
    battleMusic: document.getElementById("battleMusic")
};

/* =====================
   AI & BOSSES
===================== */
async function fetchQuestionsFromAI(language) {
    const randomModel = GROQ_MODELS[Math.floor(Math.random() * GROQ_MODELS.length)];
    const prompt = `Generate 10 multiple-choice questions for 6th-grade ${language}. Return ONLY JSON array: [{"q":"Q", "a":["O1","O2","O3","O4"], "correct":0}].`;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: randomModel, messages: [{role:"user", content: prompt}] })
        });
        const data = await response.json();
        return JSON.parse(data.choices[0].message.content.replace(/```json|```/g, "").trim());
    } catch (e) { return null; }
}

const monsters = [
    { name: "Slime", img: "images/monster_slime.png", hp: 80, dialogue: "The slime dissolves!" },
    { name: "Goblin", img: "images/monster_goblin.png", hp: 120, dialogue: "The goblin flees!" }, 
    { name: "Sorcerer", img: "images/monster_sorcerer.png", hp: 200, dialogue: "The sorcerer vanishes!" }, 
    { name: "Dragon", img: "images/monster_dragon.png", hp: 300, dialogue: "The dragon falls!" }
];

/* =====================
   CORE LOGIC
===================== */
async function startGame(lang) {
    currentLanguage = lang;
    el.home.classList.remove("active");
    el.battle.classList.add("active");
    
    el.homeMusic.pause();
    el.battleMusic.play().catch(e => console.log("Music blocked"));

    playerHealth = 100;
    el.player.classList.remove("dead");
    el.options.classList.remove("centered-layout");
    updatePlayerUI();

    const aiQuestions = await fetchQuestionsFromAI(lang);
    questionPool = aiQuestions ? shuffle(aiQuestions) : shuffle([...(questionData[lang] || questionData["English"])]);

    currentMonster = 0;
    loadMonster();
    loadQuestion();
}

function updateMonsterUI() { el.monsterHp.style.width = Math.max(0, (monsterHealth / monsterMaxHealth) * 100) + "%"; }
function updatePlayerUI() { el.playerHp.style.width = Math.max(0, (playerHealth / playerMaxHealth) * 100) + "%"; }

function loadMonster() {
    const m = monsters[currentMonster];
    el.monster.style.backgroundImage = `url('${m.img}')`;
    monsterHealth = m.hp; monsterMaxHealth = m.hp;
    updateMonsterUI();
}

function loadQuestion() {
    inputLocked = false;
    currentQuestion = questionPool.pop();
    el.question.innerText = currentQuestion.q;
    el.options.innerHTML = "";
    currentQuestion.a.forEach((opt, i) => {
        const btn = document.createElement("button");
        btn.className = "answer-btn";
        btn.innerText = opt;
        btn.onclick = () => handleAnswer(i);
        el.options.appendChild(btn);
    });
}

function handleAnswer(i) {
    if (inputLocked) return;
    inputLocked = true;
    audio.ctx.resume();

    if (i === currentQuestion.correct) {
        el.player.classList.add("attacking");
        audio.beep(600, 0.1); 
        setTimeout(() => {
            el.monster.classList.add("taking-damage");
            monsterHealth -= 40; updateMonsterUI();
        }, 200);
        setTimeout(() => {
            el.player.classList.remove("attacking"); el.monster.classList.remove("taking-damage");
            monsterHealth <= 0 ? showDialogue() : loadQuestion();
        }, 800);
    } else {
        el.monster.classList.add("monster-attacking");
        audio.beep(150, 0.3); 
        setTimeout(() => {
            el.player.classList.add("taking-damage");
            playerHealth -= 25; updatePlayerUI();
        }, 200);
        setTimeout(() => {
            el.monster.classList.remove("monster-attacking"); el.player.classList.remove("taking-damage");
            playerHealth <= 0 ? handleDeath() : loadQuestion();
        }, 800);
    }
}

function handleDeath() {
    el.player.classList.add("dead");
    el.question.innerText = "YOU HAVE FALLEN IN BATTLE...";
    el.options.classList.add("centered-layout"); 
    el.options.innerHTML = `<button class="retry-btn" onclick="location.reload()">RETRY</button>`;
}

function showDialogue() {
    el.dialogue.innerText = monsters[currentMonster].dialogue;
    el.dialogue.style.display = "block";
    setTimeout(() => {
        el.dialogue.style.display = "none";
        nextMonster();
    }, 2000);
}

function nextMonster() {
    if (currentMonster < monsters.length - 1) {
        currentMonster++;
        // HEALTH RESET AFTER EACH BOSS
        playerHealth = playerMaxHealth;
        updatePlayerUI();
        loadMonster();
        loadQuestion();
    } else {
        el.question.innerText = "CHAMPION! All monsters defeated.";
        el.options.classList.add("centered-layout"); 
        // PLAY AGAIN BUTTON WITH EPIC STYLE
        el.options.innerHTML = "<button class='retry-btn' onclick='location.reload()'>PLAY AGAIN</button>";
    }
}

function shuffle(array) { return array.sort(() => Math.random() - 0.5); }

/* =====================
   LISTENERS
===================== */
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".menu .btn").forEach(btn => btn.onclick = () => startGame(btn.getAttribute("data-lang")));
    document.getElementById("reset-btn").onclick = () => location.reload();

    document.getElementById("music-toggle").onclick = function() {
        if (el.homeMusic.paused) { el.homeMusic.play(); this.innerText = "MUSIC: ON"; }
        else { el.homeMusic.pause(); this.innerText = "MUSIC: OFF"; }
    };

    document.getElementById("battle-music-toggle").onclick = function() {
        if (el.battleMusic.paused) { el.battleMusic.play(); this.innerText = "BATTLE MUSIC: ON"; }
        else { el.battleMusic.pause(); this.innerText = "BATTLE MUSIC: OFF"; }
    };
});