require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const Metaphor = require("metaphor-node").default;
const app = express();
const cors = require("cors");
const metaphor = new Metaphor(process.env.METAPHOR_API_KEY);
const OpenAI = require("openai");

const openai = new OpenAI(process.env.OPENAI_KEY);

// Use body-parser middleware to parse JSON request bodies
app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
	res.send("Hello World");
});

app.post("/api/search", async (req, res) => {
	try {
		const { queryString, numResults = 5 } = req.body;
		const response = await metaphor.search(queryString, {
			numResults,
			useAutoprompt: true,
		});
		const content = (await metaphor.getContents(response.results)).contents;

		console.log(content);

		res.json(response);
	} catch (err) {
		console.error(err);
		res.status(500).send("Internal Server Error");
	}
});

app.post("/api/itinerary", async (req, res) => {
	try {
		const { cart } = req.body;
		const pageContent = (await metaphor.getContents(cart)).contents;
		console.log(pageContent);
		dataString = "";
		for (const site of pageContent) {
			dataString +=
				site["title"] +
				"\n" +
				site["extract"] +
				"\n " +
				site["url"] +
				"\n";
		}
		//res.json(pageContent);
		const completion = await openai.chat.completions.create({
			messages: [
				{
					role: "system",
					content:
						"You are a travel agent that specializes in making itineraries for vacations. I will give you the location I will visit along with a general idea of what I plan to do there. In addition, you will receive a bunch of links and website content data of what I plan to do. Combine all of the information that I list into a properly scheduled itinerary for 3 days with timestamps included. Try your best only to plan around the events provided. Do not include any other information except the schedule and events.",
				},
				{ role: "user", content: dataString },
			],
			model: "gpt-3.5-turbo",
		});

		console.log(completion.choices);
		console.log(completion.choices[0].message.content);
		res.json(completion.choices[0].message.content);
	} catch (err) {
		console.error(err);
		res.status(500).send("Internal Server Error");
	}
	console.log("itinerary called");
});

app.post("/api/crawl", async (req, res) => {
	try {
		const { articleID } = req.body;

		console.log(articleID);
		const content = (await metaphor.getContents([articleID])).contents;

		pageExtract = content[0].extract;

		const completion = await openai.chat.completions.create({
			messages: [
				{
					role: "system",
					content:
						"You are given a website's content to summarize. Only return 1 bullet points of information.",
				},
				{ role: "user", content: pageExtract },
			],
			model: "gpt-3.5-turbo",
		});

		console.log(completion.choices[0].message.content);
		res.json(completion.choices[0].message.content);
	} catch (err) {
		console.error(err);
		res.status(500).send("Internal Server Error");
	}
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});
