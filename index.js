const fs = require("fs");
const crypto = require("crypto");
const pdfte = require("pdf-table-extractor");
const ics = require("ics");

// Settings
const input_dir = "./input";
const output_dir = "./output";

// Read all files in input directory
const files = fs.readdirSync(input_dir);
console.log(`Found ${files.length} file(s) in ${input_dir}`);

// Convenience method
Date.prototype.addHours = function (h) {
  this.setTime(this.getTime() + h * 60 * 60 * 1000);
  return this;
};

// Main functionality
files.forEach((file) => {
  if (!file.toLowerCase().endsWith(".pdf")) return; // Only handling pdfs

  const input_path = `${input_dir}/${file}`;

  console.log(`Reading ${file}...`);

  let events = [];
  let hours = 0; // This is here to make sure all shifts were added; if this is not equal to the total hours in the pdf, something went wrong

  pdfte(
    input_path,
    (result) => {
      const output_file = `${output_dir}/${file.replace(".pdf", "")}.ics`;
      const tables = result.pageTables[0].tables;
      for (let i = 4; i < tables.length - 1; i++) {
        const table = tables[i];

        const date = table[0];
        const formattedDate = date.split("-").reverse().join("-"); // Input is dd-mm-yyyy, output is yyyy-mm-dd
        const garage = table[2].replace(" garage", "");
        if (!garage) continue;

        const start = table[3];
        const duration = table[11].split(":")[0];

        const datestring = `${formattedDate} ${start}:00`;
        const startDateTime = new Date(datestring);

        const endDateTime = new Date(datestring).addHours(duration);

        const startDT = [
          startDateTime.getFullYear(),
          startDateTime.getMonth() + 1,
          startDateTime.getDate(),
          startDateTime.getHours(),
          startDateTime.getMinutes(),
        ];
        const endDT = [
          endDateTime.getFullYear(),
          endDateTime.getMonth() + 1,
          endDateTime.getDate(),
          endDateTime.getHours(),
          endDateTime.getMinutes(),
        ];

        const event = {
          productId: "roosterexport",
          uid: crypto.randomUUID(),
          startInputType: "local",
          startOutputType: "local",
          start: startDT,
          end: endDT,
          title: garage,
        };

        events.push(event);
        hours += Number(duration);

        if (i == tables.length - 2) {
          ics.createEvents(events, (error, value) => {
            if (error) {
              console.error(error);
              return;
            }
            if (!fs.existsSync(output_dir)) {
              // Making sure the output directory exists
              console.log("Output directory does not exist, creating it...");
              fs.mkdirSync(output_dir);
            }
            fs.writeFileSync(output_file, value);

            console.log(
              `Read ${hours} hours of shifts from ${file} and wrote to ${output_file}`
            ); // Logging the amount of hours read from the pdf for verification
          });
        }
      }
    },
    (error) => {
      console.log(error);
    }
  );
});
