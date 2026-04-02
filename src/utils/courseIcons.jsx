import React from "react";
import { BookOpen, Globe, Zap } from "lucide-react";

const iconMap = {
  BookOpen,
  Globe,
  Zap,
};

export function getCourseIcon(iconKey, props = {}) {
  const Icon = iconMap[iconKey] || BookOpen;
  return <Icon {...props} />;
}
