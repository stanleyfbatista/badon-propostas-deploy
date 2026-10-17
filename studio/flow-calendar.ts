// Local, explicit .ics download. No remote calendar connection or transmission.
const escapeIcs = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
function fold(line: string) {
  const encoder = new TextEncoder();
  let result = "",
    part = "",
    size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (size + bytes > 74) {
      result += part + "\r\n ";
      part = "";
      size = 1;
    }
    part += char;
    size += bytes;
  }
  return result + part;
}
export function deliveryCalendar(
  item: {
    id: number;
    title: string;
    description: string;
    due_date: string | null;
  },
  workspace: number,
  now = new Date(),
) {
  if (!item.id || !item.due_date || !/^\d{4}-\d{2}-\d{2}$/.test(item.due_date))
    throw new Error("Salve a demanda com um prazo antes de exportar.");
  const end = new Date(item.due_date + "T12:00:00Z");
  end.setUTCDate(end.getUTCDate() + 1);
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Badon Flow//Demandas//PT-BR",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:task-" + workspace + "-" + item.id + "@forms.produtorabadon.com",
      "DTSTAMP:" +
        now
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d{3}Z$/, "Z"),
      "DTSTART;VALUE=DATE:" + item.due_date.replace(/-/g, ""),
      "DTEND;VALUE=DATE:" + end.toISOString().slice(0, 10).replace(/-/g, ""),
      "SUMMARY:" + escapeIcs(item.title),
      "DESCRIPTION:" + escapeIcs(item.description || ""),
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  );
}
export function downloadDeliveryCalendar(item: any, workspace: number) {
  const url = URL.createObjectURL(
    new Blob([deliveryCalendar(item, workspace)], {
      type: "text/calendar;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "badon-demanda-" + item.id + ".ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
