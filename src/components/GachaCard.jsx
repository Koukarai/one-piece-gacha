import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  motion, 
  AnimatePresence, 
  useMotionValue, 
  useTransform, 
  useSpring 
} from "framer-motion";

import { CHARACTERS } from "../data/characters";
import { supabase } from "../lib/supabase";
import { callApi } from "../lib/apiClient";
import { SUMMON_COST } from "../game/summonOdds";

export default function GachaCard() {
  const [activeChar, setActiveChar] = useState(CHARACTERS[0]);
  const [isFlipped, setIsFlipped] = useState(true);
  const [isSummoning, setIsSummoning] = useState(false);
  const [cardKey, setCardKey] = useState(0);
  const [rarityColor, setRarityColor] = useState("rgba(255,255,255,0.1)");
  const [errorMessage, setErrorMessage] = useState(null);
  const summonInFlightRef = useRef(false);

  // --- REAL DATA STATE ---
  const [inventory, setInventory] = useState([]);
  const [berries, setBerries] = useState(0);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase.from('profiles').select('berries').eq('id', user.id).single();
      if (profile) setBerries(profile.berries);

      const { data: inv } = await supabase.from('inventory').select('character_id, count').eq('user_id', user.id);
      if (inv) {
        const mergedInventory = inv.map(item => {
          const charDetails = CHARACTERS.find(c => c.id === item.character_id);
          return { ...charDetails, count: item.count };
        }).filter(item => item.id);
        setInventory(mergedInventory);
      }
    }
    loadData();
  }, []);

  // --- HOLO PHYSICS ---
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["20deg", "-20deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-20deg", "20deg"]);
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glareOpacity = useTransform(mouseXSpring, [-0.5, 0.5], [0.1, 0.5]);

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [x, y]);

  const handleMouseLeave = () => { x.set(0); y.set(0); };

  async function handleSummon() {
    if (!userId || berries < SUMMON_COST || summonInFlightRef.current) return;
    summonInFlightRef.current = true;

    setErrorMessage(null);
    setIsSummoning(true);
    setIsFlipped(true);

    let result;
    try {
      result = await callApi("/api/summon");
    } catch (err) {
      setErrorMessage(err.message);
      setIsSummoning(false);
      setIsFlipped(false);
      summonInFlightRef.current = false;
      return;
    }

    const newChar = result.character;

    // RARITY EFFECTS
    let color = "rgba(255,255,255,0.2)";
    if (newChar.rarity === "SSR") color = "rgba(255, 62, 62, 0.8)";
    else if (newChar.rarity === "SR") color = "rgba(192, 132, 252, 0.8)";
    else if (newChar.rarity === "R") color = "rgba(96, 165, 250, 0.8)";

    setRarityColor(color);

    // ANIMATION SEQUENCE
    setTimeout(() => {
      setActiveChar(newChar);
      setIsSummoning(false);
      setIsFlipped(false);
      setCardKey((prev) => prev + 1);
      setBerries(result.newBerries);
      summonInFlightRef.current = false;

      setInventory((prev) => {
        const exists = prev.find((i) => i.id === newChar.id);
        if (exists) return prev.map((i) => (i.id === newChar.id ? { ...i, count: i.count + 1 } : i));
        return [{ ...newChar, count: 1 }, ...prev];
      });
    }, 1500); // Longer for suspense
  }

  return (
    <div className="flex flex-col items-center gap-12 w-full max-w-6xl mx-auto">
      
      {/* CARD AREA */}
      <div className="relative flex items-center justify-center h-[600px] w-full">
        
        {/* BACKGROUND GLOW */}
        <AnimatePresence>
          {isSummoning && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 4, opacity: 0.15 }}
              exit={{ opacity: 0 }}
              className="absolute w-64 h-64 rounded-full blur-[100px] pointer-events-none z-0"
              style={{ background: rarityColor }}
            />
          )}
        </AnimatePresence>

        <div 
          className="relative h-[500px] w-[320px] [perspective:1500px] z-10"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <motion.div
            key={cardKey}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="h-full w-full cursor-pointer"
            onClick={() => !isSummoning && setIsFlipped(!isFlipped)}
          >
            <motion.div
              className="h-full w-full relative [transform-style:preserve-3d]"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.8, ease: "circOut" }}
            >
              {/* FRONT (Character) */}
              <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden glass-dark border border-white/10 [backface-visibility:hidden] shadow-2xl">
                <img src={activeChar.image} alt={activeChar.name} className="absolute inset-0 h-full w-full object-cover brightness-110" />
                
                {/* GLARE / HOLO */}
                <motion.div 
                  className="absolute inset-0 w-[200%] h-[200%] pointer-events-none mix-blend-overlay opacity-30"
                  style={{ 
                    background: `radial-gradient(circle at center, white 0%, transparent 60%)`,
                    x: glareX, y: glareY, translateX: "-50%", translateY: "-50%" 
                  }}
                />
                
                {/* CONTENT OVERLAY */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-8">
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center gap-4 mb-4"
                  >
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-gray-500 font-space tracking-widest uppercase">ATK</span>
                       <span className="text-3xl text-white font-teko leading-none">{activeChar.stats.atk}</span>
                    </div>
                    <div className="h-8 w-[1px] bg-white/10"></div>
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-gray-500 font-space tracking-widest uppercase">HP</span>
                       <span className="text-3xl text-white font-teko leading-none">{activeChar.stats.hp}</span>
                    </div>
                    <div className="ml-auto">
                       <span className={`px-3 py-1 rounded-full text-xs font-black font-space tracking-tighter border ${activeChar.rarity === 'SSR' ? 'border-ssr text-ssr shadow-[0_0_10px_rgba(255,62,62,0.5)]' : 'border-white/20 text-gray-400'}`}>
                         {activeChar.rarity}
                       </span>
                    </div>
                  </motion.div>
                  
                  <h2 className="text-6xl text-white font-teko uppercase leading-[0.75] tracking-tighter mb-2 italic">
                    {activeChar.name.split(' ').map((word, i) => (
                      <span key={i} className={i === 0 ? "block" : "block text-gradient-gold"}>{word} </span>
                    ))}
                  </h2>
                  <p className="text-[10px] font-black font-space tracking-[0.3em] uppercase text-gray-500 opacity-80">{activeChar.role}</p>
                </div>
              </div>

              {/* BACK (Logo) */}
              <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden glass-dark border border-white/5 [backface-visibility:hidden] [transform:rotateY(180deg)] flex items-center justify-center bg-[#0a0a0a]">
                <div className="absolute inset-0 bg-[url('/assets/card-back.png')] opacity-10 bg-repeat bg-center"></div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-32 h-32 rounded-full border-4 ${isSummoning ? 'border-gold-500 animate-spin border-t-transparent' : 'border-white/10'} flex items-center justify-center transition-all duration-500`}>
                    <span className="font-teko text-6xl text-white italic tracking-tighter opacity-20">GL</span>
                  </div>
                  {isSummoning && <p className="font-teko text-2xl text-gold-500 mt-6 tracking-widest animate-pulse">SUMMONING...</p>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col items-center gap-6 z-20">
        <button
          onClick={handleSummon}
          disabled={isSummoning || berries < SUMMON_COST}
          className="group relative px-12 py-5 bg-gold-400 rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-[0_20px_50px_rgba(230, 162, 60,0.2)]"
        >
          <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="font-teko text-4xl text-black uppercase tracking-widest flex items-center gap-4">
            {isSummoning ? "TRANSMUTING..." : (
              <>
                RECRUIT <span className="h-6 w-[2px] bg-black/20"></span> {SUMMON_COST} ฿
              </>
            )}
          </span>
        </button>
        {errorMessage && (
          <p className="font-space text-xs text-red-400 tracking-widest uppercase">{errorMessage}</p>
        )}
        <p className="font-space text-[10px] text-gray-500 tracking-[0.4em] uppercase opacity-50">Grand Line Recruitment Agency</p>
      </div>

      {/* CLOUD VAULT */}
      <div className="w-full mt-12 pb-24">
        <div className="flex items-end justify-between border-b border-white/5 pb-4 mb-8">
           <div>
              <h3 className="font-teko text-4xl text-white tracking-wide uppercase leading-none">CLOUD VAULT</h3>
              <p className="text-[10px] font-space text-gray-600 tracking-[0.2em] uppercase mt-1">Your Eternal Collection</p>
           </div>
           <div className="text-right">
              <span className="text-3xl font-teko text-gold-500">{inventory.length}</span>
              <span className="text-[10px] font-space text-gray-600 uppercase ml-2 tracking-widest">UNITS FOUND</span>
           </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          <AnimatePresence>
            {inventory.map((char) => (
              <motion.div 
                key={char.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className={`relative aspect-[2/3] rounded-2xl overflow-hidden glass-dark border ${char.rarity === 'SSR' ? 'border-ssr/30 shadow-[0_0_15px_rgba(255,62,62,0.2)]' : 'border-white/5'} group cursor-pointer`}
              >
                <img src={char.image} alt={char.name} className="h-full w-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black to-transparent pt-8">
                  <p className="text-[10px] font-teko text-white uppercase truncate">{char.name}</p>
                </div>
                <div className="absolute top-2 right-2 bg-black/80 text-[8px] font-black text-white px-1.5 py-0.5 rounded-full border border-white/10 font-space">
                  x{char.count}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {inventory.length === 0 && (
            <div className="col-span-full py-20 text-center glass border border-dashed border-white/5 rounded-3xl">
              <p className="font-teko text-2xl text-gray-700 uppercase tracking-widest">No nakama recruited yet...</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}