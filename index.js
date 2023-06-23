const fs = require("fs");
const pdfte = require("pdf-table-extractor");
const ics = require("ics");
const crypto = require("crypto");

const input_dir = "./input";
const output_dir = "./output";

const files = fs.readdirSync(input_dir);

Date.prototype.addHours = function (h) {
  this.setTime(this.getTime() + h * 60 * 60 * 1000);
  return this;
};

files.forEach((file) => {
  if (!file.toLowerCase().endsWith(".pdf")) return;

  const input_path = `${input_dir}/${file}`;

  let events = [];
  let hours = 0;

  pdfte(
    input_path,
    (result) => {
      const output_file = `${output_dir}/${file.replace(".pdf", "")}.ics`;
      const tables = result.pageTables[0].tables;
      for (let i = 4; i < tables.length - 1; i++) {
        const table = tables[i];
        const date = table[0];
        const formattedDate = date.split("-").reverse().join("-");
        const garage = table[2].replace(" garage", "");
        if (!garage) continue;

        const start = table[3];
        const duration = table[11].split(":")[0];

        const datestring = `${formattedDate} ${start}:00`;
        const startDateTime = new Date(datestring);

        const endDateTime = new Date(datestring).addHours(duration);

        // prepare vars for ics
        const startYear = startDateTime.getFullYear();
        const startMonth = startDateTime.getMonth() + 1;
        const startDay = startDateTime.getDate();
        const startHour = startDateTime.getHours();
        const startMinute = startDateTime.getMinutes();

        const endYear = endDateTime.getFullYear();
        const endMonth = endDateTime.getMonth() + 1;
        const endDay = endDateTime.getDate();
        const endHour = endDateTime.getHours();
        const endMinute = endDateTime.getMinutes();

        const event = {
          productId: "roosterexport",
          uid: crypto.randomUUID(),
          startInputType: "local",
          startOutputType: "local",
          start: [startYear, startMonth, startDay, startHour, startMinute],
          end: [endYear, endMonth, endDay, endHour, endMinute],
          title: garage,
        };

        events.push(event);
        hours += Number(duration);

        if (i == tables.length - 2) {
          ics.createEvents(events, (error, value) => {
            if (error) {
              console.log(error);
              return;
            }
            fs.writeFileSync(output_file, value);

            console.log(
              `Read ${hours} hours of shifts from ${file} and wrote to ${output_file}`
            );
          });
        }
      }
    },
    (error) => {
      console.log(error);
    }
  );
});
