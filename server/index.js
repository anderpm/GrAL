const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const scraperController = require('./scraping/scrapingController');
const UserController = require('./userController');
const ReportController = require('./reportController');
const testController = require('./testCases/testController');



const app = express();
app.use(cors());  // Enable CORS for all routes
app.use(bodyParser.json({ limit: '10mb' })); // Parse JSON request bodies with a higher limit


function routeHandlerWrapper(controllerMethod) {
    return async (request, response) => {
        try {
            const body = await controllerMethod(request.body);
            response.json(body);
            console.log("\n### ----- Request SUCCESS  ----- ###");
        } catch (error) {
            response.sendStatus(500);
            console.log("\n ERROR: \n" + error + "\n\n### ----- Request FAILURE  ----- ###");
        }
    };
}

const userController = new UserController();
const reportController = new ReportController();

app.post('/scrapeAccessibilityResults', routeHandlerWrapper(scraperController));
app.post('/testEvaluators', routeHandlerWrapper(testController));
app.post('/userAuthentication', routeHandlerWrapper(userController.handleUserRequest.bind(userController)));
app.post('/reportStoring', routeHandlerWrapper(reportController.handleReportRequest.bind(reportController)));


// Start the server listening on the specified port.
const PORT = 7070;
app.listen(PORT, () => {
    console.log("listening on: 0.0.0.0:" + PORT);
});