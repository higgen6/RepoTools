const path = require("path");
const express = require("express");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const { ensureStorageFile } = require("./src/services/storageService");
const { getCurrentState } = require("./src/services/dashboardService");

const app = express();
const port = Number(process.env.PORT) || 4280;

ensureStorageFile();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.locals.appName = "RepoTools";
  next();
});

app.use("/", dashboardRoutes);

app.use((req, res) => {
  res.status(404).render("error", {
    pageTitle: "Not Found",
    message: "That page does not exist."
  });
});

app.use((error, req, res, next) => {
  console.error("[RepoTools]", error);

  if (req.path.startsWith("/api/")) {
    return res.status(500).json({
      ok: false,
      error: "Something went wrong while handling that request."
    });
  }

  const safeMessage = error && error.publicMessage
    ? error.publicMessage
    : "Something went wrong while loading the app.";

  res.status(500).render("error", {
    pageTitle: "Error",
    message: safeMessage
  });
});

app.listen(port, () => {
  const state = getCurrentState();
  console.log(`RepoTools running at http://localhost:${port}`);
  if (state.activeDirectory) {
    console.log(`Active directory: ${state.activeDirectory}`);
  }
});
