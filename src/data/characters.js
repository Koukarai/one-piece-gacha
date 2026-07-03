export const CHARACTERS = [
  // --- EXISTING HEROES (Do not delete your old ones, just merge these in) ---
  {
    id: "char_luffy",
    name: "Monkey D. Luffy",
    rarity: "SSR",
    role: "Fighter",
    image: "/images/luffy.png", // Make sure this matches your file
    stats: { hp: 3500, atk: 450, spd: 110 },
    passive: { name: "Gum-Gum Fruit", desc: "Immune to bullet damage. +20% ATK when HP < 30%." },
    skills: [
        { name: "Gomu Gomu no Pistol", type: "Active", desc: "Deals 150% ATK damage to one enemy." },
        { name: "Gatling Gun", type: "Ultimate", desc: "Deals 50% ATK damage 10 times." }
    ]
  },
  
  // --- NEW STRAW HATS ---
  {
    id: "char_zoro",
    name: "Roronoa Zoro",
    rarity: "SSR",
    role: "Attacker",
    image: "/images/zoro.png",
    stats: { hp: 3100, atk: 550, spd: 95 },
    passive: { name: "Three Sword Style", desc: "Critical hits cause Bleed damage." },
    skills: [
        { name: "Oni Giri", type: "Active", desc: "High damage slash to front row." },
        { name: "Asura", type: "Ultimate", desc: "Triples Attack power for 1 turn." }
    ]
  },
  {
    id: "char_sanji",
    name: "Vinsmoke Sanji",
    rarity: "SR",
    role: "Flanker",
    image: "/images/sanji.png",
    stats: { hp: 2800, atk: 420, spd: 130 },
    passive: { name: "Chivalry", desc: "Will not attack female opponents. +50% Speed." },
    skills: [
        { name: "Diable Jambe", type: "Active", desc: "Kicks ignore enemy defense." },
        { name: "Party Table Kick", type: "Ultimate", desc: "AoE damage to all enemies." }
    ]
  },
  {
    id: "char_nami",
    name: "Cat Burglar Nami",
    rarity: "SR",
    role: "Support",
    image: "/images/nami.png", // You need to download this
    stats: { hp: 2200, atk: 300, spd: 100 },
    passive: { name: "Thief", desc: "Battle rewards +20% Berries." },
    skills: [
        { name: "Thunderbolt Tempo", type: "Active", desc: "Stuns one enemy for 1 turn." },
        { name: "Mirage Tempo", type: "Ultimate", desc: "Squad gains 50% Evasion." }
    ]
  },
  {
    id: "char_chopper",
    name: "Tony Tony Chopper",
    rarity: "SR",
    role: "Healer",
    image: "/images/chopper.png", // You need to download this
    stats: { hp: 2500, atk: 250, spd: 90 },
    passive: { name: "Doctor", desc: "Heals lowest HP ally for 5% every turn." },
    skills: [
        { name: "Heavy Point", type: "Active", desc: "Deals heavy physical damage." },
        { name: "Guard Point", type: "Active", desc: "Increases HP by 30% and Taunts enemies for 1 turn" },
        { name: "Roseo Colonnade", type: "Ultimate", desc: "Heals entire squad for 40% HP." }
    ]
  },

  // --- THE POWERHOUSES (SSR) ---
  {
    id: "char_ace",
    name: "Portgas D. Ace",
    rarity: "SSR",
    role: "Blaster",
    image: "/images/ace.png",
    stats: { hp: 4000, atk: 500, spd: 105 },
    passive: { name: "Logia Defense", desc: "30% chance to ignore physical attacks." },
    skills: [
        { name: "Fire Fist", type: "Active", desc: "Massive Fire damage to one target." },
        { name: "Flame Emperor", type: "Ultimate", desc: "Nukes the entire enemy team." }
    ]
  },

  


  // --- THE VILLAINS (R / SR) ---
  {
    id: "char_buggy",
    name: "Buggy the Clown",
    rarity: "R",
    role: "Tank",
    image: "/images/buggy.png", // You need to download this
    stats: { hp: 4500, atk: 200, spd: 80 },
    passive: { name: "Chop-Chop Fruit", desc: "Immune to Slash damage (Zoro/Mihawk deal 0)." },
    skills: [
        { name: "Muggy Ball", type: "Active", desc: "Small AoE explosion." },
        { name: "Bara Bara Festival", type: "Ultimate", desc: "Randomly attacks 5 times." }
    ]
  },
  {
    id: "char_arlong",
    name: "Saw-Tooth Arlong",
    rarity: "R",
    role: "Bruiser",
    image: "/images/arlong.png", // You need to download this
    stats: { hp: 3000, atk: 350, spd: 90 },
    passive: { name: "Fishman Strength", desc: "+20% ATK against Human characters." },
    skills: [
        { name: "Shark on Darts", type: "Active", desc: "Charge attack." },
        { name: "Tooth Attack", type: "Ultimate", desc: "Heavy bite damage + Bleed." }
    ]
  },
  {
    id: "char_smoker",
    name: "Captain Smoker",
    rarity: "SR",
    role: "Controller",
    image: "/images/smoker.png", // You need to download this
    stats: { hp: 3400, atk: 380, spd: 95 },
    passive: { name: "White Plume", desc: "Enemies hitting Smoker have 30% chance to be Stunned." },
    skills: [
        { name: "White Blow", type: "Active", desc: "Long range punch." },
        { name: "White Out", type: "Ultimate", desc: "Traps 2 enemies (Can't act for 1 turn)." }
    ]
  },
  {
    id: "char_usopp",
    name: "God Usopp",
    rarity: "SR",
    role: "Sniper",
    image: "/images/usopp.png",
    stats: { hp: 2000, atk: 400, spd: 85 },
    passive: { name: "Coward", desc: "+50% Evasion when HP is low." },
    skills: [
        { name: "Firebird Star", type: "Active", desc: "Burn damage over time." },
        { name: "Impact Dial", type: "Ultimate", desc: "High damage, but Usopp takes recoil damage." }
    ]
  }
];