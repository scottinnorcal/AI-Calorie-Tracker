import React, { useState, useEffect, useRef } from 'react';
    import { createClient } from '@supabase/supabase-js';
    import { useSpring, animated } from 'react-spring';
    import { Link, useNavigate } from 'react-router-dom';
    import './App.css';
    import MealAnalysisDisplay from './components/MealAnalysisDisplay';
    import Auth from './components/Auth';

    const supabaseUrl = 'https://nouhhtzpulljacpjbwtz.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vdWhodHpwdWxsamFjcGpid3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkwNTE4NDksImV4cCI6MjA1NDYyNzg0OX0.mQUupVWxQRMErliyEwD9JFfRCMNz3gbm76rk9l6wdy4';
    const openRouterModel = 'google/gemini-pro-vision';

    const supabase = createClient(supabaseUrl, supabaseKey);

    async function analyzeImageWithOpenRouter(imageData, apiKey, model, messageHistory, userGoal, dailyCaloriesGoal) {
      try {
        const messages = [
          {
            role: 'user',
            content: [
              {
                type: "text",
                text: `You are a food analysis expert. Analyze the meal in the attached image.

                        Provide your analysis in a user-friendly format.

                        Include the following information:

                        - List of detected foods
                        - Estimated total calories
                        - Nutritional breakdown (protein, carbs, fat)
                        - A brief summary of the meal's nutritional profile
                        - A recommendation based on the user's goal and calorie goal

                        If no food items are detected, state that no food items were detected.

                        The user's goal is ${userGoal} and the daily calorie goal is ${dailyCaloriesGoal}.`
              },
              {
                type: "image_url",
                image_url: {
                  "url": imageData, // Pass the base64 data URL directly
                },
              },
            ],
          },
          ...messageHistory.map(msg => ({ // Format previous messages correctly
            role: msg.role,
            content: [{ type: "text", text: msg.content }],
          })),
        ];

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: openRouterModel,
            messages: messages,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenRouter API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;

      } catch (err) {
        console.error('Error analyzing image:', err);
        throw err;
      }
    }

    function App() {
      const [meals, setMeals] = useState([]);
      const [imageData, setImageData] = useState(null);
      const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
      const [userGoal, setUserGoal] = useState('');
      const [dailyCaloriesGoal, setDailyCaloriesGoal] = useState(2000);
      const [analysisResult, setAnalysisResult] = useState(null);
      const [loading, setLoading] = useState(false);
      const [messageHistory, setMessageHistory] = useState([]);
      const [userQuestion, setUserQuestion] = useState('');
      const [error, setError] = useState(null);
      const [isTyping, setIsTyping] = useState(false);
      const [facingMode, setFacingMode] = useState('user');
      const [openRouterApiKey, setOpenRouterApiKey] = useState('');
      const [session, setSession] = useState(null);
      const [ateMeal, setAteMeal] = useState(true); // Default to true

      const videoRef = useRef(null);
      const navigate = useNavigate();

      const fadeIn = useSpring({ opacity: 1, from: { opacity: 0 }, delay: 200 });
      const imagePreviewSpring = useSpring({
        transform: imagePreviewUrl ? 'scale(1)' : 'scale(0.9)',
        opacity: imagePreviewUrl ? 1 : 0,
        config: { tension: 180, friction: 12 },
      });

      useEffect(() => {
        supabase.auth.getSession()
          .then(({ data: { session } }) => {
            setSession(session);
          });

        supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
        });

        const storedApiKey = localStorage.getItem('openRouterApiKey');
        if (storedApiKey) {
          setOpenRouterApiKey(storedApiKey);
        } else {
          navigate('/admin');
          return;
        }

        const fetchMeals = async () => {
          try {
            let { data, error } = await supabase.from('meals').select('*');
            if (error) {
              if (error.message.includes('relation "public.meals" does not exist')) {
                setError(
                  "The 'meals' table does not exist in your Supabase database. Please create it."
                );
              } else {
                console.error('Error fetching meals:', error);
                setError(`Error fetching meals: ${error.message}`);
              }
            } else {
              setMeals(data || []);
            }
          } catch (err) {
            console.error('Error fetching meals:', err);
            setError(`Error fetching meals: ${err.message}`);
          }
        };

        fetchMeals();

        const startCamera = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } });
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          } catch (err) {
            console.error('Error accessing camera:', err);
            if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
              setError(
                "Camera access was denied. Please grant camera permission in your browser settings."
              );
            } else {
              setError(`Error accessing camera: ${err.message}`);
            }
          }
        };
        startCamera();

        return () => {
          if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          }
        };
      }, [facingMode, navigate]);



      const handleCapture = async () => {
        if (!openRouterApiKey) {
          setError("API Key is missing. Please set it in the admin panel.");
          navigate('/admin');
          return;
        }

        setLoading(true);
        setError(null);
        setMessageHistory([]);
        setAnalysisResult(null);

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImageData(dataUrl); // Keep this, we'll use it for the API call
        setImagePreviewUrl(dataUrl);

        try {
          const fileName = `meal_${Date.now()}.jpg`;
          const contentType = 'image/jpeg';
          const response = await fetch(dataUrl);
          const blob = await response.blob();

          let { data, error } = await supabase.storage
            .from('meal-images')
            .upload(fileName, blob, {
              contentType: contentType,
              upsert: false,
            });

          if (error) {
            console.error('Error uploading image:', error);
            setError(`Error uploading image: ${error.message}`);
            setLoading(false);
            return;
          }

          const { data: publicUrlData } = supabase.storage.from('meal-images').getPublicUrl(data.path);
          const imageUrl = publicUrlData.publicUrl;

          // Call analyzeImageWithOpenRouter with the base64 data URL
          const analysis = await analyzeImageWithOpenRouter(dataUrl, openRouterApiKey, openRouterModel, [], userGoal, dailyCaloriesGoal);
          setAnalysisResult(analysis);
          setMessageHistory([{ role: 'assistant', content: analysis }]);

          if (ateMeal) {
            const now = new Date();
            const timestamp = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear().toString().slice(2)}`;

            const { error: insertError } = await supabase.from('meals').insert([
              {
                image_url: imageUrl,
                analysis: analysis,
                user_goal: userGoal,
                daily_calories_goal: dailyCaloriesGoal,
                created_at: timestamp, // Add local timestamp
              }
            ]);

            if (insertError) {
              console.error('Error inserting meal data:', insertError);
              setError(`Error inserting meal data: ${insertError.message}`);
            } else {
              const { data: updatedMeals, error: fetchError } = await supabase
                .from('meals')
                .select('*');

              if (fetchError) {
                console.error('Error fetching updated meals:', fetchError);
                setError(`Error fetching updated meals: ${fetchError.message}`);
              } else {
                setMeals(updatedMeals || []);
              }
            }
          }


        } catch (err) {
          console.error('Error in capture process:', err);
          if (err.message.includes('OpenRouter API error')) {
            setError(
              `Error with OpenRouter API: ${err.message}. Please check your API key in the admin panel.`
            );
          } else {
            setError(`Error: ${err.message}`);
          }
        } finally {
          setLoading(false);
        }
      };


      const handleGoalChange = (event) => {
        setUserGoal(event.target.value);
      };

      const handleCalorieGoalChange = (event) => {
        setDailyCaloriesGoal(Number(event.target.value));
      };

      const handleQuestionChange = (event) => {
        setUserQuestion(event.target.value);
      };

      const handleAskQuestion = async () => {
        if (!openRouterApiKey) {
          setError("API Key is missing. Please set it in the admin panel.");
          navigate('/admin');
          return;
        }
        if (!userQuestion.trim()) {
          setError("Please enter a question.");
          return;
        }

        setLoading(true);
        setError(null);
        setIsTyping(true);
        let updatedMessageHistory = [...messageHistory, { role: 'user', content: userQuestion }];

        try {
          //If the user asks about their diet history, summarize the relevant meals and provide a recommendation
          if (userQuestion.toLowerCase().includes("diet") || userQuestion.toLowerCase().includes("how have i done") || userQuestion.toLowerCase().includes("analyze my diet")) {
            const timeFrame = userQuestion.toLowerCase().includes("today") ? "today" :
              userQuestion.toLowerCase().includes("week") ? "last week" :
                userQuestion.toLowerCase().includes("month") ? "last month" : "all time";

            let filteredMeals = meals;

            if (timeFrame === "today") {
              const today = new Date();
              const todayDateString = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear().toString().slice(2)}`;
              filteredMeals = meals.filter(meal => meal.created_at === todayDateString);
            } else if (timeFrame === "last week") {
              const lastWeek = new Date();
              lastWeek.setDate(lastWeek.getDate() - 7);
              filteredMeals = meals.filter(meal => {
                const mealDate = new Date(meal.created_at);
                return mealDate >= lastWeek;
              });
            } else if (timeFrame === "last month") {
              const lastMonth = new Date();
              lastMonth.setMonth(lastMonth.getMonth() - 1);
              filteredMeals = meals.filter(meal => {
                const mealDate = new Date(meal.created_at);
                return mealDate >= lastMonth;
              });
            } else if (timeFrame === "all time") {
              // No filtering needed for all time
            }

            if (filteredMeals.length === 0) {
              setMessageHistory([...updatedMessageHistory, { role: 'assistant', content: `No meal history found for ${timeFrame}.` }]);
            } else {
              //Summarize the meals and provide a recommendation
              let mealSummary = "";
              let totalCalories = 0;

              filteredMeals.forEach(meal => {
                mealSummary += `Meal on ${meal.created_at}: ${meal.analysis}\n`;
                try {
                  const parsedAnalysis = typeof meal.analysis === 'string' ? meal.analysis.split('\n').find(part => part.includes('total calories'))?.split(': ')[1] : null;
                  if (parsedAnalysis) {
                    totalCalories += parseInt(parsedAnalysis);
                  }
                } catch (e) {
                  console.error("Error parsing calories", e);
                }
              });

              const averageCalories = filteredMeals.length > 0 ? totalCalories / filteredMeals.length : 0;

              let dietRecommendation = `Based on your meal history for ${timeFrame}:\n${mealSummary}\n`;
              dietRecommendation += `Average calories per meal: ${averageCalories.toFixed(2)}.\n`;

              if (userGoal === "lose weight") {
                if (averageCalories > dailyCaloriesGoal / 3) {
                  dietRecommendation += "Consider reducing portion sizes or choosing lower-calorie options to meet your weight loss goals.";
                } else {
                  dietRecommendation += "Your calorie intake seems to be within a good range for your weight loss goal.";
                }
              } else if (userGoal === "gain muscle") {
                dietRecommendation += "Make sure to get enough protein! Consider adding more protein sources to your diet to support muscle growth.";
              } else {
                dietRecommendation += "Try to maintain a balanced diet with a variety of nutrients.";
              }

              setMessageHistory([...updatedMessageHistory, { role: 'assistant', content: dietRecommendation }]);
            }
          } else {
            // For regular questions, send the base64 image data
            const response = await analyzeImageWithOpenRouter(
              imageData, // Use imageData (base64)
              openRouterApiKey,
              openRouterModel,
              updatedMessageHistory,
              userGoal,
              dailyCaloriesGoal
            );
            setMessageHistory([...updatedMessageHistory, { role: 'assistant', content: response }]);
          }
          setUserQuestion('');
        } catch (err) {
          console.error('Error asking question:', err);
          if (err.message.includes('OpenRouter API error')) {
            setError(
              `Error with OpenRouter API: ${err.message}. Please check your API key in the admin panel.`
            );
          } else {
            setError(`Error asking question: ${err.message}`);
          }

        } finally {
          setLoading(false);
          setIsTyping(false);
        }
      };

      const handleDietAnalysis = async (timeFrame) => {
        if (!openRouterApiKey) {
          setError("API Key is missing. Please set it in the admin panel.");
          navigate('/admin');
          return;
        }

        setLoading(true);
        setError(null);
        setIsTyping(true);
        let updatedMessageHistory = [...messageHistory, { role: 'user', content: `Analyze my diet for ${timeFrame}` }];

        try {
          let filteredMeals = meals;

          if (timeFrame === "today") {
            const today = new Date();
            const todayDateString = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear().toString().slice(2)}`;
            filteredMeals = meals.filter(meal => meal.created_at === todayDateString);
          } else if (timeFrame === "last week") {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            filteredMeals = meals.filter(meal => {
              const mealDate = new Date(meal.created_at);
              return mealDate >= lastWeek;
            });
          } else if (timeFrame === "last month") {
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            filteredMeals = meals.filter(meal => {
              const mealDate = new Date(meal.created_at);
              return mealDate >= lastMonth;
            });
          } else if (timeFrame === "all time") {
            // No filtering needed for all time
          }

          if (filteredMeals.length === 0) {
            setMessageHistory([...updatedMessageHistory, { role: 'assistant', content: `No meal history found for ${timeFrame}.` }]);
          } else {
            //Summarize the meals and provide a recommendation
            let mealSummary = "";
            let totalCalories = 0;

            filteredMeals.forEach(meal => {
              mealSummary += `Meal on ${meal.created_at}: ${meal.analysis}\n`;
              try {
                const parsedAnalysis = typeof meal.analysis === 'string' ? meal.analysis.split('\n').find(part => part.includes('total calories'))?.split(': ')[1] : null;
                if (parsedAnalysis) {
                  totalCalories += parseInt(parsedAnalysis);
                }
              } catch (e) {
                console.error("Error parsing calories", e);
              }
            });

            const averageCalories = filteredMeals.length > 0 ? totalCalories / filteredMeals.length : 0;

            let dietRecommendation = `Based on your meal history for ${timeFrame}:\n${mealSummary}\n`;
            dietRecommendation += `Average calories per meal: ${averageCalories.toFixed(2)}.\n`;

            if (userGoal === "lose weight") {
              if (averageCalories > dailyCaloriesGoal / 3) {
                dietRecommendation += "Consider reducing portion sizes or choosing lower-calorie options to meet your weight loss goals.";
              } else {
                dietRecommendation += "Your calorie intake seems to be within a good range for your weight loss goal.";
              }
            } else if (userGoal === "gain muscle") {
              dietRecommendation += "Make sure to get enough protein! Consider adding more protein sources to your diet to support muscle growth.";
            } else {
              dietRecommendation += "Try to maintain a balanced diet with a variety of nutrients.";
            }

            setMessageHistory([...updatedMessageHistory, { role: 'assistant', content: dietRecommendation }]);
          }
          setUserQuestion('');
        } catch (err) {
          console.error('Error asking question:', err);
          if (err.message.includes('OpenRouter API error')) {
            setError(
              `Error with OpenRouter API: ${err.message}. Please check your API key in the admin panel.`
            );
          } else {
            setError(`Error asking question: ${err.message}`);
          }

        } finally {
          setLoading(false);
          setIsTyping(false);
        }
      };

      const getRecommendation = (analysis, goal, calorieGoal) => {
        if (!analysis) return "No analysis available.";
        const parsedAnalysis = typeof analysis === 'string' ? analysis.split('\n').find(part => part.includes('total calories'))?.split(': ')[1] : null;

        if (goal === "lose weight") {
          if (parsedAnalysis && parseInt(parsedAnalysis) > calorieGoal / 3) {
            return "This meal seems a bit high in calories for your weight loss goal. Consider reducing portion sizes or choosing lower-calorie options.";
          } else {
            return "This meal seems to be within your calorie goals for weight loss.";
          }
        } else if (goal === "gain muscle") {
          return "Make sure to get enough protein! Consider adding more protein sources to your diet.";
        } else {
          return "Try to maintain a balanced diet with a variety of nutrients.";
        }
      };

      const recommendation = getRecommendation(analysisResult, userGoal, dailyCaloriesGoal);

      const toggleFacingMode = () => {
        setFacingMode(prevMode => (prevMode === 'user' ? 'environment' : 'user'));
      };

      const handleDeleteMeal = async (mealId) => {
        try {
          const { error } = await supabase
            .from('meals')
            .delete()
            .match({ id: mealId });

          if (error) {
            console.error('Error deleting meal:', error);
            setError(`Error deleting meal: ${error.message}`);
          } else {
            // Update the meals state to reflect the deletion
            setMeals(meals.filter((meal) => meal.id !== mealId));
          }
        } catch (err) {
          console.error('Error deleting meal:', err);
          setError(`Error deleting meal: ${err.message}`);
        }
      };

      if (!session) {
        return <Auth />;
      }


      return (
        <div className="container">
          <header>
            <h1>Calorie Tracker</h1>
            <p>Track your meals and get AI-powered analysis.</p>
          </header>

          <main>
            <animated.section style={fadeIn} className="capture-section">
              <h2>Capture Meal</h2>
              <div className="video-container">
                <video ref={videoRef} autoPlay playsInline />
                <button onClick={toggleFacingMode} className="secondary-button">
                  Switch Camera ({facingMode === 'user' ? 'Front' : 'Rear'})
                </button>
              </div>
              <div>
                <label>
                  Are you eating this?
                  <input
                    type="checkbox"
                    checked={ateMeal}
                    onChange={(e) => setAteMeal(e.target.checked)}
                  />
                </label>
              </div>
              {openRouterApiKey && (
                <button onClick={handleCapture} disabled={loading || !!error} className="primary-button">
                  {loading ? 'Processing...' : 'Capture and Analyze'}
                </button>
              )}
              {imagePreviewUrl && (
                <animated.div style={imagePreviewSpring} className="image-preview">
                  <h3>Image Preview</h3>
                  <img src={imagePreviewUrl} alt="Captured Meal" />
                </animated.div>
              )}
            </animated.section>

            <section className="goals-section">
              <h2>User Goals</h2>
              <div className="form-group">
                <label htmlFor="goal">Goal:</label>
                <input
                  type="text"
                  id="goal"
                  value={userGoal}
                  onChange={handleGoalChange}
                  placeholder="e.g., lose weight, gain muscle"
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label htmlFor="calories">Daily Calories:</label>
                <input
                  type="number"
                  id="calories"
                  value={dailyCaloriesGoal}
                  onChange={handleCalorieGoalChange}
                  className="form-control"
                />
              </div>
            </section>

            <animated.section style={fadeIn} className="analysis-section">
              <h2>Analysis Result</h2>
              {loading && <p className="loading-message">Analyzing...</p>}
              {error && <p className="error-message">Error: {error}</p>}
              {analysisResult && (
                <>
                  <p>{analysisResult}</p>
                  <div className="recommendation">
                    <strong>Recommendation:</strong> {recommendation}
                  </div>

                </>
              )}
              <div className="conversation-section">
                <h3>Ask a Question:</h3>
                <div className="form-group">
                  <input
                    type="text"
                    value={userQuestion}
                    onChange={handleQuestionChange}
                    placeholder="Ask a follow-up question..."
                    className="form-control"
                  />
                </div>
                <button onClick={handleAskQuestion} disabled={loading} className="secondary-button">
                  {loading ? 'Asking...' : 'Ask'}
                </button>
                <h4>Conversation History:</h4>
                <div className="message-history">
                  {isTyping && <div className="typing-indicator">AI is typing...</div>}
                  {messageHistory.map((message, index) => (
                    <div key={index} className={`message ${message.role}`}>
                      <p><strong>{message.role === 'user' ? 'You' : 'AI'}:</strong> {message.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </animated.section>

            <section className="meals-section">
              <h2>Meal History</h2>
              <button onClick={() => handleDietAnalysis("today")} className="secondary-button">Analyze Diet Today</button>
              <button onClick={() => handleDietAnalysis("last week")} className="secondary-button">Analyze Diet Last Week</button>
              <button onClick={() => handleDietAnalysis("last month")} className="secondary-button">Analyze Diet Last Month</button>
              <button onClick={() => handleDietAnalysis("all time")} className="secondary-button">Analyze Diet All Time</button>
              <ul className="meal-list">
                {meals.map((meal) => (
                  <li key={meal.id} className="meal-item">
                    <img src={meal.image_url} alt="Meal" />
                    <div className="meal-details">
                      <p>{meal.analysis}</p>
                      <p><strong>User Goal:</strong> {meal.user_goal}</p>
                      <p><strong>Daily Calorie Goal:</strong> {meal.daily_calories_goal}</p>
                      <p><strong>Time:</strong> {meal.created_at}</p> {/* Display timestamp */}
                    </div>
                    <button onClick={() => handleDeleteMeal(meal.id)} className="secondary-button">
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </main>

          <footer>
            <Link to="/admin">Admin</Link>
          </footer>
        </div>
      );
    }

    export default App;
