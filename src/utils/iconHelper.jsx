import React from 'react';
import { 
  Video, FileText, CheckSquare, Award, BookOpen, 
  PlayCircle, PenTool, RotateCcw, ArrowRight, 
  ClipboardCheck, Layout, Users, Zap 
} from 'lucide-react';

export const getIcon = (iconName, className = "") => {
  const icons = {
    "Video": <Video size={18} />,
    "FileText": <FileText size={18} />,
    "CheckSquare": <CheckSquare size={18} />,
    "Award": <Award size={18} />,
    "BookOpen": <BookOpen size={18} />,
    "PlayCircle": <PlayCircle size={18} />,
    "PenTool": <PenTool size={18} />,
    "RotateCcw": <RotateCcw size={18} />,
    "ArrowRight": <ArrowRight size={18} />,
    "ClipboardCheck": <ClipboardCheck size={18} />,
    "Layout": <Layout size={18} />,
    "Users": <Users size={18} />,
    "Zap": <Zap size={18} />
  };
  
  const IconComponent = icons[iconName] || <BookOpen size={18} />;
  return React.cloneElement(IconComponent, { className: `${IconComponent.props.className} ${className}` });
};