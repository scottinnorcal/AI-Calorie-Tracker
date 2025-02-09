import React from 'react';
import { useSpring, animated } from 'react-spring';
import './MealAnalysisDisplay.css';

function MealAnalysisDisplay({ analysis }) {
  const props = useSpring({ opacity: 1, from: { opacity: 0 }, delay: 200 });

  // Parse the analysis if it's a string, otherwise assume it's already an object
  let parsedAnalysis;
  try {
      parsedAnalysis = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
      if (!parsedAnalysis) {
          throw new Error("Analysis is null or undefined"); // Handle null/undefined
      }
  } catch (error) {
      console.error("Error parsing analysis:", error);
      return <p>Error parsing analysis data.</p>; // Show error to user
  }
  if (!parsedAnalysis || !parsedAnalysis.foods) {
    return <p>No analysis available.</p>;
  }


  return (
    <animated.div style={props} className="meal-analysis-container">
      {parsedAnalysis.foods.length > 0 ? (
        <>
          <div className="analysis-card">
            <h3>Detected Foods</h3>
            <ul>
              {parsedAnalysis.foods.map((food, index) => (
                <li key={index}>{food}</li>
              ))}
            </ul>
          </div>
          <div className="analysis-card">
            <h3>Estimated Calories</h3>
            <p>{parsedAnalysis.totalCalories}</p>
          </div>
          <div className="analysis-card">
            <h3>Nutritional Breakdown</h3>
            <p>Protein: {parsedAnalysis.nutrients.protein}</p>
            <p>Carbs: {parsedAnalysis.nutrients.carbs}</p>
            <p>Fat: {parsedAnalysis.nutrients.fat}</p>
          </div>
            <div className="analysis-card">
            <h3>Summary</h3>
            <p>{parsedAnalysis.analysisSummary}</p>
          </div>
        </>
      ) : (
        <div className="analysis-card">
          <h3>Analysis Result</h3>
          <p>{parsedAnalysis.analysisSummary}</p>
        </div>
      )}
    </animated.div>
  );
}

export default MealAnalysisDisplay;
