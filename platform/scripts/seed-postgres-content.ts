import { seedPostgresContent } from "../api/src/server";

seedPostgresContent()
  .then(() => {
    console.log("Static chapters seeded into Postgres.");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
