import { motion } from "motion/react";
import type { ReactNode } from "react";

export default function AuthTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full h-full flex justify-center items-center"
    >
      {children}
    </motion.div>
  );
}