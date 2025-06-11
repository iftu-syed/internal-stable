const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const app = express();
const port = 3011;

// MongoDB connection setup
mongoose.connect('mongodb+srv://admin:admin@cluster0.d3ycy.mongodb.net/dashboards', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log("Connected to MongoDB!");
});

// Serve static files (HTML, CSS, JS) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'doc_dashboard.html'));
});

// API to return summary data for the number cards
app.get('/api/summary', async (req, res) => {
  try {
      const collection = db.collection('proms_data');

      // Aggregation pipeline to get the total numbers
      const aggregationPipeline = [
          {
              $group: {
                  _id: null,
                  totalPatientsRegistered: { $sum: 1 }, // Assuming each document represents one registered patient
                  totalSurveysSent: { $sum: { $cond: [{ $ifNull: ["$surveySentDate", false] }, 1, 0] } }, // Count only if surveySentDate exists
                  totalSurveysCompleted: { $sum: { $cond: [{ $ifNull: ["$score", false] }, 1, 0] } } // Count only if survey is completed (i.e., score exists)
              }
          },
          {
              $project: {
                  _id: 0,
                  totalPatientsRegistered: 1,
                  totalSurveysSent: 1,
                  totalSurveysCompleted: 1,
                  surveyResponseRate: {
                      $multiply: [
                          { $cond: [{ $eq: ["$totalSurveysSent", 0] }, 0, { $divide: ["$totalSurveysCompleted", "$totalSurveysSent"] }] },
                          100
                      ]
                  }
              }
          }
      ];

      // Execute the aggregation and send the result
      const results = await collection.aggregate(aggregationPipeline).toArray();
      const summaryData = results[0]; // Get the first result
      res.json(summaryData);
  } catch (error) {
      console.error("Error fetching summary data:", error);
      res.status(500).json({ message: "Error fetching summary data" });
  }
});


// API endpoint to get response rate month-over-month
app.get('/api/response-rate-time-series', async (req, res) => {
  try {
      const collection = db.collection('proms_data');

      // Aggregation pipeline to calculate monthly response rates
      const aggregationPipeline = [
          {
              $match: {
                  surveySentDate: { $exists: true },  // Ensure sent dates exist
              }
          },
          {
              $addFields: {
                  monthYear: {
                      $dateToString: { format: "%Y-%m", date: "$surveySentDate" }
                  },
                  isCompleted: {
                      $cond: [{ $ifNull: ["$surveyReceivedDate", false] }, 1, 0]
                  }
              }
          },
          {
              $group: {
                  _id: "$monthYear",
                  totalSurveysSent: { $sum: 1 },
                  totalSurveysCompleted: { $sum: "$isCompleted" }
              }
          },
          {
              $project: {
                  _id: 0,
                  monthYear: "$_id",
                  responseRate: {
                      $cond: [
                          { $eq: ["$totalSurveysSent", 0] },
                          0,  // If no surveys sent, response rate is 0
                          { $multiply: [{ $divide: ["$totalSurveysCompleted", "$totalSurveysSent"] }, 100] }
                      ]
                  }
              }
          },
          {
              $sort: { monthYear: 1 }  // Sort by monthYear ascending
          }
      ];

      const results = await collection.aggregate(aggregationPipeline).toArray();

      res.json(results);
  } catch (error) {
      console.error("Error fetching time series response rate data:", error);
      res.status(500).json({ message: "Error fetching data" });
  }
});

// API endpoint to get mean score data by timeline
app.get('/api/mean-score-by-survey-timeline', async (req, res) => {
    try {
        const { promsInstrument, diagnosisICD10, scale } = req.query; // Include scale in the query parameters
        const collection = db.collection('proms_data');

        // Aggregation pipeline
        const aggregationPipeline = [
            {
                $match: {
                    promsInstrument: promsInstrument, // Filter by specified promsInstrument
                    diagnosisICD10: diagnosisICD10,   // Filter by specified diagnosisICD10
                    scale: scale,                     // Filter by specified scale
                    surveyReceivedDate: { $ne: null } // Only include records where surveyReceivedDate is not null
                }
            },
            {
                $group: {
                    _id: "$surveyType",               // Group by surveyType (x-axis)
                    meanScore: { $avg: "$score" }     // Calculate mean of scores (y-axis)
                }
            },
            {
                $project: {
                    _id: 0,                           // Exclude MongoDB ID from result
                    surveyType: "$_id",
                    meanScore: 1                      // Include the calculated meanScore
                }
            },
            {
                $sort: { surveyType: 1 }              // Sort by surveyType for consistent order
            }
        ];

        // Execute the aggregation and return results
        const results = await collection.aggregate(aggregationPipeline).toArray();
        res.json(results);
    } catch (error) {
        console.error("Error fetching mean score data:", error);
        res.status(500).json({ message: "Error fetching mean score data" });
    }
});
  

// API endpoint to populate the dropdown with valid combinations of PROMs Instrument and Diagnosis
app.get('/api/get-combined-options', async (req, res) => {
    try {
        const collection = db.collection('proms_data');

        // Aggregation pipeline to get valid combinations and sort them
        const aggregationPipeline = [
            {
                $group: {
                    _id: "$diagnosisICD10",
                    promsInstruments: { $addToSet: "$promsInstrument" }
                }
            },
            {
                $project: {
                    _id: 0,
                    combinations: {
                        $map: {
                            input: "$promsInstruments",
                            as: "promsInstrument",
                            in: { $concat: ["$_id", " - ", "$$promsInstrument"] }
                        }
                    }
                }
            },
            {
                $unwind: "$combinations"
            },
            {
                $group: {
                    _id: null,
                    combinedOptions: { $addToSet: "$combinations" }
                }
            },
            {
                $project: {
                    _id: 0,
                    combinedOptions: 1
                }
            },
            {
                $unwind: "$combinedOptions"
            },
            {
                $sort: { combinedOptions: 1 } // Sort combined options in ascending order
            },
            {
                $group: {
                    _id: null,
                    combinedOptions: { $push: "$combinedOptions" }
                }
            },
            {
                $project: {
                    _id: 0,
                    combinedOptions: 1
                }
            }
        ];

        // Execute the aggregation and send the result
        const results = await collection.aggregate(aggregationPipeline).toArray();
        const response = results[0] || { combinedOptions: [] }; // Fallback in case of empty results

        res.json(response);
    } catch (error) {
        console.error("Error fetching sorted combined dropdown values:", error);
        res.status(500).json({ message: "Error fetching dropdown values" });
    }
});


// API endpoint for hierarchical dropdown values diagnosis, proms instrument and scale
app.get('/api/get-hierarchical-options', async (req, res) => {
    try {
        const collection = db.collection('proms_data');

        // Aggregation pipeline to get hierarchical data
        const aggregationPipeline = [
            {
                $group: {
                    _id: {
                        diagnosisICD10: "$diagnosisICD10",
                        promsInstrument: "$promsInstrument",
                        scale: "$scale"
                    }
                }
            },
            {
                $group: {
                    _id: {
                        diagnosisICD10: "$_id.diagnosisICD10",
                        promsInstrument: "$_id.promsInstrument"
                    },
                    scales: { $addToSet: "$_id.scale" }
                }
            },
            {
                $group: {
                    _id: "$_id.diagnosisICD10",
                    promsInstruments: {
                        $push: {
                            promsInstrument: "$_id.promsInstrument",
                            scales: "$scales"
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    diagnosisICD10: "$_id",
                    promsInstruments: 1
                }
            },
            {
                $sort: { diagnosisICD10: 1 } // Sort by diagnosisICD10
            }
        ];

        // Execute the aggregation and send the result
        const results = await collection.aggregate(aggregationPipeline).toArray();
        res.json(results);
    } catch (error) {
        console.error("Error fetching hierarchical dropdown values:", error);
        res.status(500).json({ message: "Error fetching dropdown values" });
    }
});

// API endpoint to fetch individual PROMs scores for scatter plot
app.get('/api/proms-scores', async (req, res) => {
    const { promsInstrument, diagnosisICD10, scale } = req.query;
    try {
        const collection = db.collection('proms_data');

        const query = {
            promsInstrument: promsInstrument,
            diagnosisICD10: diagnosisICD10,
            scale: scale,
            surveyReceivedDate: { $exists: true }
        };

        const projection = {
            _id: 0,
            surveyReceivedDate: 1,
            score: 1
        };

        const results = await collection.find(query).project(projection).toArray();
        res.json(results);
    } catch (error) {
        console.error("Error fetching PROMs scores for scatter plot:", error);
        res.status(500).json({ message: "Error fetching data" });
    }
});

// API endpoint to aggregate data for Treatment Plan vs Diagnosis
app.get('/api/treatment-diagnosis-heatmap', async (req, res) => {
    try {
        const collection = db.collection('proms_data');

        // Aggregation pipeline to count occurrences for each treatment plan and diagnosis combination
        const aggregationPipeline = [
            {
                $group: {
                    _id: { treatmentPlan: "$treatmentPlan", diagnosisICD10: "$diagnosisICD10" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    treatmentPlan: "$_id.treatmentPlan",
                    diagnosisICD10: "$_id.diagnosisICD10",
                    count: 1
                }
            }
        ];

        // Execute the aggregation
        const results = await collection.aggregate(aggregationPipeline).toArray();
        res.json(results);
    } catch (error) {
        console.error("Error fetching treatment-diagnosis data:", error);
        res.status(500).json({ message: "Error fetching treatment-diagnosis data" });
    }
});


// API to get the total number of patients and those achieving MCID by surveyType
app.get('/api/patients-mcid-count', async (req, res) => {
    try {
        const { promsInstrument, diagnosisICD10, scale } = req.query;
        const collection = db.collection('proms_data');

        const aggregationPipeline = [
            {
                $match: {
                    promsInstrument: promsInstrument,
                    diagnosisICD10: diagnosisICD10,
                    scale: scale
                }
            },
            {
                $group: {
                    _id: "$surveyType",
                    totalPatients: { $sum: 1 },
                    mcidAchieved: { $sum: { $cond: [{ $ifNull: ["$mcid", false] }, 1, 0] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    surveyType: "$_id",
                    totalPatients: 1,
                    mcidAchieved: 1
                }
            },
            {
                $sort: { surveyType: 1 }
            }
        ];

        const results = await collection.aggregate(aggregationPipeline).toArray();
        res.json(results);
    } catch (error) {
        console.error("Error fetching MCID data:", error);
        res.status(500).json({ message: "Error fetching MCID data" });
    }
});
  

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
