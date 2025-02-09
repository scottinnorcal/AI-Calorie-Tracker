import React from 'react';
import { useSpring, animated } from 'react-spring';
import './MealAnalysisDisplay.css';

function MealAnalysisDisplay({ analysis }) {
  const props = useSpring({ opacity: 1, from: { opacity: 0 }, delay: 200 });

  const parseAnalysis = (analysis) => {
    if (!analysis) return null;

    const parts = analysis.split('\n');
    const detectedFoods = parts.find(part => part.includes('foods detected'))?.split(': ')[1] || 'Not available';
    const estimatedCalories = parts.find(part => part.includes('total calories'))?.split(': ')[1] || 'Not available';
    const nutritionalBreakdown = parts.find(part => part.includes('Nutritional breakdown'))?.split(': ')[1] || 'Not available';

    return {
      detectedFoods,
      estimatedCalories,
      nutritionalBreakdown,
    };
  };

  const parsed = parseAnalysis(analysis);

  if (!parsed) {
    return <p>No analysis available.</p>;
  }

  return (
    <animated.div style={props} className="meal-analysis-container">
      <div className="analysis-card">
        <h3>Detected Foods</h3>
        <p>{parsed.detectedFoods}</p>
      </div>
      <div className="analysis-card">
        <h3>Estimated Calories</h3>
        <p>{parsed.estimatedCalories}</p>
      </div>
      <div className="analysis-card">
        <h3>Nutritional Breakdown</h3>
        <p>{parsed.nutritionalBreakdown}</p>
      </div>
    </animated.div>
  );
}

export default MealAnalysisDisplay;
