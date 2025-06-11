var Server = "https://www.assessmentcenter.net/ac_api/2014-01/Forms";
var CORS_PROXY = "http://localhost:8081/";
var globalAssessmentID = ""; // Global variable to store the assessment ID
var ItemResponseOID = "";    // Global variable to store the item response ID
var Response = "";           // Global variable to store the response value
var isFirstQuestion = true; // Flag to track the first question of the current form
// Predefined values
var predefinedRegistration = "B1138D93-56C0-4F91-A00F-B9EA28743028";
var predefinedToken = "F1EC46FD-7E7F-474B-868E-63EEF61C9104";
// var predefinedFormOIDs = ["572240E6-AA7D-4F45-BC20-E95422EBDB94","67F4CABD-E88C-453B-AE64-D5287FD7C8AC","5BBC42A9-53CE-4703-8CAA-14100E452FEC"];
var predefinedFormOIDs = []; // Now it will be populated dynamically
// var predefinedFormOIDs = ["DE842374-9C50-4BD7-98AF-F097EFB45D35","2E58348D-A4E1-4667-AF7B-BC9891EE3609"];
var currentFormIndex = 0;

//cat form id : 3EB8FC37-1874-4EBC-9504-69F47F2A72BF,CODCB3EA-CFFD-4A77-9488-DBAF51225106,5A04F794-A21C-4F82-8D6D-1CF0BA5A4ACO
async function fetchApiObjectIds(mr_no) {
    try {
        const response = await fetch(`/getApiObjectIds?mr_no=${mr_no}`);
        const data = await response.json();

        if (data.success && data.apiObjectIds.length > 0) {
            predefinedFormOIDs = data.apiObjectIds; // Dynamically set the array
            console.log("Fetched API Object IDs: ", predefinedFormOIDs);
        } else {
            console.error("Error fetching API Object IDs or no form OIDs found.");
            alert("No API Object IDs found for this mr_no.");
        }
    } catch (error) {
        console.error("Error fetching API Object IDs: ", error);
        alert("An error occurred while fetching API Object IDs.");
    }
}


function listForms() {
    $.ajax({
        url: Server + "/.json",
        cache: false,
        type: "POST",
        data: "",
        dataType: "json",

        beforeSend: function (xhr) {
            var combinedString = predefinedRegistration + ":" + predefinedToken;
            var base64 = btoa(combinedString); // Use btoa to encode to base64
            xhr.setRequestHeader("Authorization", "Basic " + base64);
        },

        success: function (data) {
            var container = document.getElementById("Content");
            var forms = data.Form;
            for (var i = 0; i < forms.length; i++) {
                var myform = document.createElement("div");
                myform.innerHTML = forms[i].OID + " : " + forms[i].Name;
                container.appendChild(myform);
            }
        },

        error: function (jqXHR, textStatus, errorThrown) {
            document.write(jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
        }
    });
}

function formDetails() {
    $.ajax({
        url: CORS_PROXY + Server + "/" + predefinedFormOIDs[currentFormIndex],
        cache: false,
        type: "GET",
        dataType: "html",

        beforeSend: function (xhr) {
            var combinedString = predefinedRegistration + ":" + predefinedToken;
            var base64 = btoa(combinedString);
            xhr.setRequestHeader("Authorization", "Basic " + base64);
        },

        success: function (data) {
            var container = document.getElementById("Content");
            container.innerHTML = data; // Display the HTML content directly
        },

        error: function (jqXHR, textStatus, errorThrown) {
            alert(jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
        }
    });
}

function startAssessment() {
    if (currentFormIndex >= predefinedFormOIDs.length) {
        alert("All assessments completed.");
        return;
    }

    var uid = document.getElementById("UID").value;
    var formOID = predefinedFormOIDs[currentFormIndex];

    $.ajax({
        url: CORS_PROXY + "https://www.assessmentcenter.net/ac_api/2014-01/Assessments/" + formOID + ".json",
        cache: false,
        type: "POST",
        data: JSON.stringify({ UID: uid }),
        dataType: "json",
        contentType: "application/json",

        beforeSend: function (xhr) {
            var combinedString = predefinedRegistration + ":" + predefinedToken;
            var base64 = btoa(combinedString);
            xhr.setRequestHeader("Authorization", "Basic " + base64);
        },

        success: function (data) {
            console.log("Response Data: ", data); // Log the response to understand its structure
            var container = document.getElementById("Content");
            container.innerHTML = ""; // Clear previous content

            globalAssessmentID = data.OID || data.AssessmentID || "Not provided"; // Store assessment ID globally
            var userID = data.UID || uid; // Use a fallback if UID is not present
            var expiration = data.Expiration || "Not provided"; // Use a fallback if Expiration is not present

            // Create and append Assessment ID
            var assessmentIDElement = document.createElement("p");
            assessmentIDElement.innerHTML = "<strong>AssessmentID:</strong> " + globalAssessmentID;
            container.appendChild(assessmentIDElement);

            // Create and append User-defined ID
            var userIDElement = document.createElement("p");
            userIDElement.innerHTML = "<strong>User-defined ID:</strong> " + userID;
            container.appendChild(userIDElement);

            // Create and append Expiration
            var expirationElement = document.createElement("p");
            expirationElement.id = "expirationDate";
            expirationElement.innerHTML = "<strong>Expiration:</strong> " + expiration;
            container.appendChild(expirationElement);

            // Get the first question
            getAssessmentQuestion();
        },

        error: function (jqXHR, textStatus, errorThrown) {
            console.error("Error response: ", jqXHR.responseText);
            alert(jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
        }
    });
}

function getAssessmentQuestion() {
    $.ajax({
        url: CORS_PROXY + "https://www.assessmentcenter.net/ac_api/2014-01/Participants/" + globalAssessmentID + ".json",
        cache: false,
        type: "GET",
        dataType: "json",

        beforeSend: function (xhr) {
            var combinedString = predefinedRegistration + ":" + predefinedToken;
            var base64 = btoa(combinedString);
            xhr.setRequestHeader("Authorization", "Basic " + base64);
        },

        success: function (data) {
            console.log("Current Question Data: ", data); // Log the response to understand its structure

            if (data.Items && data.Items.length > 0) {
                var elements = data.Items[0].Elements;
                if (elements && elements.length > 0) {
                    console.log("Elements: ", elements); // Log elements to inspect them

                    // Find the element with the Map property
                    var elementWithMap = elements.find(el => el.Map && el.Map.length > 0);

                    if (elementWithMap) {
                        var question = elements[1].Description; // Assuming the question is in the second element
                        var map = elementWithMap.Map;

                        // Store the ItemResponseOID and Response globally
                        ItemResponseOID = map[0].ItemResponseOID;
                        Response = map[0].Value;

                        renderScreen(question, map);
                    } else {
                        console.error("No map found in any element. Elements data: ", elements);
                        alert("No map found in any element. Please check the console for more details.");
                    }
                } else {
                    console.error("No elements found in the first item. Items data: ", data.Items);
                    alert("No elements found in the first item. Please check the console for more details.");
                }
            } else {
                console.error("No items found in the response. Data: ", data);
                alert("No items found in the response. Please check the console for more details.");
            }
        },

        error: function (jqXHR, textStatus, errorThrown) {
            console.error("Error response: ", jqXHR.responseText);
            alert(jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
        }
    });
}

// function renderScreen(question, map) {
//     var container = document.getElementById("Content");
//     container.innerHTML = ""; // Clear previous content

//     // Display the question
//     var questionElement = document.createElement("p");
//     questionElement.classList.add("question");
//     questionElement.innerHTML = question;
//     container.appendChild(questionElement);

//     // Display the possible answers
//     var answersContainer = document.createElement("div");
//     answersContainer.classList.add("answers-container");

//     if (map && map.length > 0) {
//         for (var i = 0; i < map.length; i++) {
//             var answerElement = document.createElement("button");
//             answerElement.innerHTML = map[i].Description;
//             answerElement.classList.add("answer-button");
//             answerElement.setAttribute("data-item-response-oid", map[i].ItemResponseOID);
//             answerElement.setAttribute("data-response", map[i].Value);
//             answerElement.setAttribute("data-score", map[i].Score || 0); // Assume Score is part of map[i]
//             answerElement.onclick = function() {
//                 postAnswer(this.getAttribute("data-item-response-oid"), this.getAttribute("data-response"), parseInt(this.getAttribute("data-score")));
//             };
//             answersContainer.appendChild(answerElement);
//         }
//     } else {
//         var fallbackMessage = document.createElement("p");
//         fallbackMessage.innerHTML = "No answer options available.";
//         answersContainer.appendChild(fallbackMessage);
//     }

//     container.appendChild(answersContainer);
// }


// function renderScreen(question, map) {
//     var container = document.getElementById("Content");
//     container.innerHTML = ""; // Clear previous content

//     // Show the custom message only for the first question of the first form
//     if (isFirstQuestion && currentFormIndex === 0) {
//         var messageElement = document.createElement("p");
//         messageElement.classList.add("custom-message");
//         messageElement.innerHTML = "Kindly answer the questions that follow, with a focus on your symptoms for the particular condition that you are attending this specific clinic.";
//         container.appendChild(messageElement);
        
//         // Set the flag to false so the message won't appear again
//         isFirstQuestion = false;
//     }

//     // Display the question
//     var questionElement = document.createElement("p");
//     questionElement.classList.add("question");
//     questionElement.innerHTML = question;
//     container.appendChild(questionElement);

//     // Display the possible answers
//     var answersContainer = document.createElement("div");
//     answersContainer.classList.add("answers-container");

//     if (map && map.length > 0) {
//         for (var i = 0; i < map.length; i++) {
//             var answerElement = document.createElement("button");
//             answerElement.innerHTML = map[i].Description;
//             answerElement.classList.add("answer-button");
//             answerElement.setAttribute("data-item-response-oid", map[i].ItemResponseOID);
//             answerElement.setAttribute("data-response", map[i].Value);
//             answerElement.setAttribute("data-score", map[i].Score || 0); // Assume Score is part of map[i]
//             answerElement.onclick = function() {
//                 postAnswer(this.getAttribute("data-item-response-oid"), this.getAttribute("data-response"), parseInt(this.getAttribute("data-score")));
//             };
//             answersContainer.appendChild(answerElement);
//         }
//     } else {
//         var fallbackMessage = document.createElement("p");
//         fallbackMessage.innerHTML = "No answer options available.";
//         answersContainer.appendChild(fallbackMessage);
//     }

//     container.appendChild(answersContainer);
// }


// function renderScreen(question, map) {
//     var container = document.getElementById("Content");
//     if (!container) {
//         console.error("Container element with ID 'Content' not found.");
//         return;
//     }

//     container.innerHTML = ""; // Clear previous content

//     // Display the question
//     var questionElement = document.createElement("p");
//     questionElement.classList.add("question");
//     questionElement.innerHTML = question;
//     container.appendChild(questionElement);

//     // Display the possible answers
//     var answersContainer = document.createElement("div");
//     answersContainer.id = "custom-radio"; // Set the ID for the container
//     answersContainer.classList.add("answers-container");

//     if (map && map.length > 0) {
//         map.forEach((item, index) => {
//             console.log("Processing item:", item);

//             // Create radio input
//             var radioInput = document.createElement("input");
//             radioInput.type = "radio";
//             radioInput.name = question; // Use the question text as the name attribute
//             radioInput.id = `EDPS_${index}`;
//             radioInput.value = item.Value;
//             radioInput.required = true;

//             // Create label
//             var radioLabel = document.createElement("label");
//             radioLabel.setAttribute("for", radioInput.id);
//             radioLabel.setAttribute("data-en", item.Description); // English text
//             radioLabel.setAttribute("data-ar", item.Description); // Arabic text, adjust if needed
//             radioLabel.setAttribute("radio-option", item.Description);
//             radioLabel.innerHTML = item.Description; // Set the label text

//             // Append input and label to the container
//             answersContainer.appendChild(radioInput);
//             answersContainer.appendChild(radioLabel);

//             // Optional: Add event listener for radio button change
//             radioInput.addEventListener("change", function() {
//                 console.log("Radio button selected:", item.Description);
//                 postAnswer(item.ItemResponseOID, item.Value, item.Score || 0);
//             });
//         });

//         // Add a placeholder div for custom positioning if needed
//         var customRadioPos = document.createElement("div");
//         customRadioPos.id = "custom-radio-pos";
//         answersContainer.appendChild(customRadioPos);

//     } else {
//         var fallbackMessage = document.createElement("p");
//         fallbackMessage.innerHTML = "No answer options available.";
//         answersContainer.appendChild(fallbackMessage);
//     }

//     container.appendChild(answersContainer);
// }


// function renderScreen(question, map) {
//     var container = document.getElementById("Content");
//     if (!container) {
//         console.error("Container element with ID 'Content' not found.");
//         return;
//     }

//     container.innerHTML = ""; // Clear previous content

//     // Show the custom message only for the first question of the first form
//     if (isFirstQuestion && currentFormIndex === 0) {
//         var infoBox = document.querySelector(".infobox p"); // Find the paragraph in the infobox
//         if (infoBox) {
//             var messageElement = document.createElement("p");
//             messageElement.classList.add("custom-message");
//             messageElement.innerHTML = "Kindly answer the questions that follow, with a focus on your symptoms for the particular condition that you are attending this specific clinic.";
//             messageElement.style.fontWeight = "bold";
//             infoBox.parentNode.insertBefore(messageElement, infoBox.nextSibling); // Insert after the infobox paragraph
//         }
//     }

//     // Display the question
//     var questionElement = document.createElement("p");
//     questionElement.classList.add("question");
//     questionElement.innerHTML = question;
//     container.appendChild(questionElement);

//     // Display the possible answers
//     var answersContainer = document.createElement("div");
//     answersContainer.id = "custom-radio"; // Set the ID for the container
//     answersContainer.classList.add("answers-container");

//     if (map && map.length > 0) {
//         map.forEach((item, index) => {
//             console.log("Processing item:", item);

//             // Create radio input
//             var radioInput = document.createElement("input");
//             radioInput.type = "radio";
//             radioInput.name = question; // Use the question text as the name attribute
//             radioInput.id = `EDPS_${index}`;
//             radioInput.value = item.Value;
//             radioInput.required = true;

//             // Create label
//             var radioLabel = document.createElement("label");
//             radioLabel.setAttribute("for", radioInput.id);
//             radioLabel.setAttribute("data-en", item.Description); // English text
//             radioLabel.setAttribute("data-ar", item.Description); // Arabic text, adjust if needed
//             radioLabel.setAttribute("radio-option", item.Description);
//             radioLabel.innerHTML = item.Description; // Set the label text

//             // Append input and label to the container
//             answersContainer.appendChild(radioInput);
//             answersContainer.appendChild(radioLabel);

//             // Optional: Add event listener for radio button change
//             radioInput.addEventListener("change", function() {
//                 console.log("Radio button selected:", item.Description);
//                 postAnswer(item.ItemResponseOID, item.Value, item.Score || 0);

//                 // Remove the custom message after the first question attempt
//                 var messageElement = document.querySelector(".custom-message");
//                 if (messageElement) {
//                     messageElement.remove(); // Remove the custom message
//                 }

//                 // Set the flag to false so the message won't appear again
//                 isFirstQuestion = false;
//             });
//         });

//         // Add a placeholder div for custom positioning if needed
//         var customRadioPos = document.createElement("div");
//         customRadioPos.id = "custom-radio-pos";
//         answersContainer.appendChild(customRadioPos);

//     } else {
//         var fallbackMessage = document.createElement("p");
//         fallbackMessage.innerHTML = "No answer options available.";
//         answersContainer.appendChild(fallbackMessage);
//     }

//     container.appendChild(answersContainer);
// }


//code after mobile css update

function renderScreen(question, map) {
    var container = document.getElementById("Content");
    if (!container) {
        console.error("Container element with ID 'Content' not found.");
        return;
    }

    container.innerHTML = ""; // Clear previous content

    // Show the custom message only for the first question of the first form
    if (isFirstQuestion && currentFormIndex === 0) {
        var infoBox = document.querySelector(".infobox p"); // Find the paragraph in the infobox
        if (infoBox && !document.querySelector(".custom-message")) { // Check if custom-message already exists
            var messageElement = document.createElement("p");
            messageElement.classList.add("custom-message");
            messageElement.innerHTML = "Kindly answer the questions that follow, with a focus on your symptoms for the particular condition that you are attending this specific clinic.";
            messageElement.style.fontWeight = "bold";
            infoBox.parentNode.insertBefore(messageElement, infoBox.nextSibling); // Insert after the infobox paragraph
        }
    }
    // Display the question
    var questionElement = document.createElement("p");
    questionElement.classList.add("question");
    questionElement.innerHTML = question;
    container.appendChild(questionElement);

    // Display the possible answers
    var answersContainer = document.createElement("div");
    answersContainer.id = "custom-radio"; // Set the ID for the container
    answersContainer.classList.add("answers-container");

    if (map && map.length > 0) {
        map.forEach((item, index) => {
            console.log("Processing item:", item);

            // Create radio input
            var radioInput = document.createElement("input");
            radioInput.type = "radio";
            radioInput.name = question; // Use the question text as the name attribute
            radioInput.id = `EDPS_${index}`;
            radioInput.value = item.Value;
            radioInput.required = true;

            // Create label
            var radioLabel = document.createElement("label");
            radioLabel.setAttribute("for", radioInput.id);
            radioLabel.setAttribute("data-en", item.Description); // English text
            radioLabel.setAttribute("data-ar", item.Description); // Arabic text, adjust if needed
            radioLabel.setAttribute("radio-option", item.Description);
            radioLabel.innerHTML = item.Description; // Set the label text

            // Append input and label to the container
            answersContainer.appendChild(radioInput);
            answersContainer.appendChild(radioLabel);

            // Optional: Add event listener for radio button change
            radioInput.addEventListener("change", function() {
                console.log("Radio button selected:", item.Description);
                postAnswer(item.ItemResponseOID, item.Value, item.Score || 0);
            
                // Remove the custom message after the first question attempt
                var messageElement = document.querySelector(".custom-message");
                if (messageElement) {
                    messageElement.remove(); // Remove the custom message
                }
            
                // Set the flag to false so the message won't appear again
                isFirstQuestion = false;
            });
        });

        // Add a placeholder div for custom positioning if needed
        var customRadioPos = document.createElement("div");
        customRadioPos.id = "custom-radio-pos";
        answersContainer.appendChild(customRadioPos);

    } else {
        var fallbackMessage = document.createElement("p");
        fallbackMessage.innerHTML = "No answer options available.";
        answersContainer.appendChild(fallbackMessage);
    }

    container.appendChild(answersContainer);

    var isMobile = window.matchMedia("(max-width: 768px)").matches;
var formWrapper = document.createElement("div");
formWrapper.classList.add(isMobile ? "responsive-grid-radio" : "answers-container");

if (map && map.length > 0) {
    map.forEach((item, index) => {
        console.log("Processing item:", item);

        // Create radio button and label depending on layout
        var radioInput = document.createElement("input");
        radioInput.type = "radio";
        radioInput.name = question;
        radioInput.id = isMobile ? `EDPS_mobile_${index}` : `EDPS_${index}`;
        radioInput.value = item.Value;
        radioInput.required = true;

        var radioLabel = document.createElement("label");
        radioLabel.setAttribute("for", radioInput.id);
        radioLabel.setAttribute("data-en", item.Description);
        radioLabel.setAttribute("data-ar", item.Description);
        radioLabel.innerHTML = item.Description;

        if (isMobile) {
            // Mobile-specific layout
            var radioGrid = document.createElement("div");
            radioGrid.classList.add("radio-grid");
            radioGrid.appendChild(radioInput);
            radioGrid.appendChild(radioLabel);
            formWrapper.appendChild(radioGrid);
        } else {
            // Desktop layout
            formWrapper.appendChild(radioInput);
            formWrapper.appendChild(radioLabel);
        }

        // Add event listener to remove the custom message on first question attempt
        radioInput.addEventListener("change", function() {
            console.log("Radio button selected:", item.Description);
            postAnswer(item.ItemResponseOID, item.Value, item.Score || 0);

            // Remove the custom message after the first question attempt
            var messageElement = document.querySelector(".custom-message");
            if (messageElement) {
                messageElement.remove();
            }

            // Set the flag to false to prevent message from reappearing
            isFirstQuestion = false;
        });
    });
} else {
    var fallbackMessage = document.createElement("p");
    fallbackMessage.innerHTML = "No answer options available.";
    formWrapper.appendChild(fallbackMessage);
}

container.appendChild(formWrapper);
}





function postAnswer(itemResponseOID, response, score) {
    var postedData = "ItemResponseOID=" + itemResponseOID + "&Response=" + response;

    $.ajax({
        url: CORS_PROXY + "https://www.assessmentcenter.net/ac_api/2014-01/Participants/" + globalAssessmentID + ".json",
        cache: false,
        type: "POST",
        data: postedData,
        dataType: "json",

        beforeSend: function (xhr) {
            var combinedString = predefinedRegistration + ":" + predefinedToken;
            var base64 = btoa(combinedString);
            xhr.setRequestHeader("Authorization", "Basic " + base64);
        },

        success: function (data) {
            if (data.DateFinished != '') {
                displayFinalScore(globalAssessmentID);
                return;
            }
            getAssessmentQuestion();
        },

        error: function (jqXHR, textStatus, errorThrown) {
            alert('postAnswer: ' + jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
        }
    });
}

function displayFinalScore(assessmentID) {
    $.ajax({
        url: CORS_PROXY + "https://www.assessmentcenter.net/ac_api/2014-01/Results/" + assessmentID + ".json",
        cache: false,
        type: "GET",
        dataType: "json",

        beforeSend: function (xhr) {
            var combinedString = predefinedRegistration + ":" + predefinedToken;
            var base64 = btoa(combinedString);
            xhr.setRequestHeader("Authorization", "Basic " + base64);
        },

        success: function (data) {
            var container = document.getElementById("Content");
            container.innerHTML = ""; // Clear previous content

            if (data.Error) {
                container.innerHTML = "Error: " + data.Error;
                return;
            }

            var tScore = (data.Theta * 10 + 50.0).toFixed(2);
            var stdError = (data.StdError * 10).toFixed(2);

            var scoreElement = document.createElement("p");
            scoreElement.innerHTML = "Final Score: " + tScore + " (Standard Error: " + stdError + ")";
            container.appendChild(scoreElement);

            for (var i = 0; i < data.Items.length; i++) {
                var itemElement = document.createElement("div");
                itemElement.innerHTML = "ID: " + data.Items[i].ID + ", Position: " + data.Items[i].Position + ", Theta: " + data.Items[i].Theta + ", Error: " + data.Items[i].StdError;
                container.appendChild(itemElement);
            }

            // Store the score in MongoDB
            storeScoreInMongoDB(data);
        },

        error: function (jqXHR, textStatus, errorThrown) {
            alert('displayFinalScore: ' + jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
        }
    });
}



function storeScoreInMongoDB(data) {
    var uid = document.getElementById("UID").value;
    var assessmentID = globalAssessmentID;
    var expirationElement = document.getElementById("expirationDate");
    var expiration = expirationElement ? expirationElement.innerText.split(": ")[1] : "Not provided";
    var formID = predefinedFormOIDs[currentFormIndex];

    var scoreData = {
        Mr_no: uid, // Use Mr_no from the UID field
        formID: formID,
        assessmentID: assessmentID,
        expiration: expiration,
        scoreDetails: data
    };

    $.ajax({
        url: "/storeScore", // Express route to store data in MongoDB
        type: "POST",
        data: JSON.stringify(scoreData),
        contentType: "application/json",
        success: function (response) {
            console.log("Score stored successfully: ", response);
            currentFormIndex++; // Move to the next form

            if (currentFormIndex >= predefinedFormOIDs.length) {
                // All assessments completed
                $.ajax({
                    url: "/updateFinalStatus",
                    type: "POST",
                    data: JSON.stringify({ Mr_no: uid }),
                    contentType: "application/json",
                    success: function (response) {
                        console.log("Final status updated: ", response);
                        
                        // Fetch the patient's DOB from the database
                        $.ajax({
                            url: `/getPatientDOB?Mr_no=${uid}`,
                            type: "GET",
                            success: function (data) {
                                const dob = data.DOB; // Assuming the response contains the DOB

                                // Correct final redirection to the details page on port 3088
                                window.location.href = `http://localhost/patientsurveys/details?Mr_no=${uid}&DOB=${dob}`;
                            },
                            error: function (jqXHR, textStatus, errorThrown) {
                                console.error('Error fetching DOB: ' + jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
                            }
                        });
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        console.error('updateFinalStatus: ' + jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
                    }
                });
            } else {
                startAssessment(); // Start the next assessment
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error('storeScoreInMongoDB: ' + jqXHR.responseText + ':' + textStatus + ':' + errorThrown);
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const mr_no = getParameterByName('mr_no');
    if (mr_no) {
        await fetchApiObjectIds(mr_no); // Fetch the form OIDs dynamically
        document.getElementById('UID').value = mr_no; // Set the UID field with mr_no from URL
        
        // Start the assessment after fetching the OIDs
        if (predefinedFormOIDs.length > 0) {
            startAssessment(); // Start the assessment process
        }
    }
});
