import { motion } from "framer-motion";

const symbols = ["₿", "Ξ", "Ł", "₮", "◎", "Ð", "⬡"];

const FloatingBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Gradient orbs */}
      <div className="gradient-orb w-96 h-96 bg-primary/20 top-[-10%] left-[-5%] animate-pulse-glow" />
      <div className="gradient-orb w-80 h-80 bg-accent/20 bottom-[-10%] right-[-5%] animate-pulse-glow" style={{ animationDelay: "2s" }} />
      <div className="gradient-orb w-64 h-64 bg-primary/10 top-[40%] right-[20%] animate-pulse-glow" style={{ animationDelay: "4s" }} />

      {/* Floating crypto symbols */}
      {symbols.map((symbol, i) => (
        <motion.div
          key={i}
          className="absolute text-primary/5 font-bold select-none"
          style={{
            fontSize: `${2 + Math.random() * 3}rem`,
            top: `${10 + (i * 12) % 80}%`,
            left: `${5 + (i * 14) % 90}%`,
          }}
          animate={{
            y: [0, -30, 10, -20, 0],
            x: [0, 10, -15, 5, 0],
            rotate: [0, 5, -3, 2, 0],
          }}
          transition={{
            duration: 6 + i * 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {symbol}
        </motion.div>
      ))}
    </div>
  );
};

export default FloatingBackground;
