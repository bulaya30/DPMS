const express = require("express");
const cors = require("cors");

const birdsRoutes = require("./routes/birds");
const feedsRoutes = require("./routes/feeds");
const eggsRoutes = require("./routes/eggs");
const vaccinationRoutes = require("./routes/vaccination");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/birds", birdsRoutes);
app.use("/feeds", feedsRoutes);
app.use("/eggs", eggsRoutes);
app.use("/vaccination", vaccinationRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
