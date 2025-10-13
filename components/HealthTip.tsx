"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, RefreshCw, Lightbulb } from 'lucide-react';

const HEALTH_TIPS = [
  {
    title: "Stay Hydrated",
    tip: "Drink at least 8 glasses of water daily to maintain proper bodily functions and support overall health.",
    category: "General Health"
  },
  {
    title: "Regular Exercise",
    tip: "Aim for 150 minutes of moderate aerobic activity per week to maintain cardiovascular health.",
    category: "Fitness"
  },
  {
    title: "Healthy Sleep",
    tip: "Adults should get 7-9 hours of quality sleep each night for optimal physical and mental health.",
    category: "Sleep"
  },
  {
    title: "Balanced Diet",
    tip: "Include a variety of fruits, vegetables, whole grains, and lean proteins in your daily meals.",
    category: "Nutrition"
  },
  {
    title: "Stress Management",
    tip: "Practice relaxation techniques like deep breathing, meditation, or yoga to manage daily stress.",
    category: "Mental Health"
  },
  {
    title: "Regular Check-ups",
    tip: "Schedule annual health screenings and keep up with recommended vaccinations and preventive care.",
    category: "Preventive Care"
  },
  {
    title: "Hand Hygiene",
    tip: "Wash your hands frequently with soap and water for at least 20 seconds to prevent infections.",
    category: "Prevention"
  },
  {
    title: "Sun Protection",
    tip: "Use sunscreen with SPF 30+ and wear protective clothing when exposed to direct sunlight.",
    category: "Skin Care"
  },
  {
    title: "Limit Screen Time",
    tip: "Take regular breaks from screens and follow the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.",
    category: "Eye Health"
  },
  {
    title: "Social Connections",
    tip: "Maintain meaningful relationships and social connections for better mental and emotional well-being.",
    category: "Mental Health"
  }
];

interface HealthTipProps {
  className?: string;
}

export function HealthTip({ className = "" }: HealthTipProps) {
  const [currentTip, setCurrentTip] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % HEALTH_TIPS.length);
    }, 10000); // Change tip every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const nextTip = () => {
    setCurrentTip((prev) => (prev + 1) % HEALTH_TIPS.length);
  };

  const currentHealthTip = HEALTH_TIPS[currentTip];

  if (!isVisible) return null;

  return (
    <Card className={`bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-700 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <Heart className="text-white" size={16} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="text-green-600 dark:text-green-400" size={14} />
                <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                  {currentHealthTip.category}
                </span>
              </div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                {currentHealthTip.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentHealthTip.tip}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={nextTip}
              className="h-8 w-8 p-0 rounded-full hover:bg-green-100 dark:hover:bg-green-800"
              title="Next tip"
            >
              <RefreshCw size={14} className="text-green-600 dark:text-green-400" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Close"
            >
              <span className="text-gray-400 text-xs">×</span>
            </Button>
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="flex gap-1 mt-3">
          {HEALTH_TIPS.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors ${
                index === currentTip
                  ? 'bg-green-500'
                  : 'bg-green-200 dark:bg-green-800'
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
