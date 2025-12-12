import { useState } from "react";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { Teacher, Feedback } from "@shared/schema";

interface ExportButtonProps {
  data: Teacher[] | Feedback[];
  type: "teachers" | "feedback";
  filename?: string;
}

export function ExportButton({ data, type, filename }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      let csvContent = "";
      let headers: string[] = [];
      let rows: string[][] = [];

      if (type === "teachers") {
        const teachers = data as Teacher[];
        headers = ["Name", "Department", "Subject", "Average Rating", "Total Feedback"];
        rows = teachers.map((t) => [
          t.name,
          t.department || "",
          t.subject || "",
          (t.averageRating || 0).toFixed(2),
          (t.totalFeedback || 0).toString(),
        ]);
      } else {
        const feedback = data as Feedback[];
        headers = ["Student Name", "Teacher ID", "Rating", "Comment", "Subject", "Date"];
        rows = feedback.map((f) => [
          f.studentName,
          f.teacherId,
          f.rating.toString(),
          f.comment || "",
          f.subject || "",
          f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "",
        ]);
      }

      csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename || type}-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful!",
        description: `Exported ${data.length} ${type} to CSV`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = () => {
    setIsExporting(true);
    try {
      // Create a simple HTML table for PDF
      let htmlContent = `
        <html>
          <head>
            <title>${filename || type} Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              h1 { color: #333; }
            </style>
          </head>
          <body>
            <h1>${filename || type.charAt(0).toUpperCase() + type.slice(1)} Report</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <table>
      `;

      if (type === "teachers") {
        const teachers = data as Teacher[];
        htmlContent += `
          <tr>
            <th>Name</th>
            <th>Department</th>
            <th>Subject</th>
            <th>Average Rating</th>
            <th>Total Feedback</th>
          </tr>
        `;
        teachers.forEach((t) => {
          htmlContent += `
            <tr>
              <td>${t.name}</td>
              <td>${t.department || ""}</td>
              <td>${t.subject || ""}</td>
              <td>${(t.averageRating || 0).toFixed(2)}</td>
              <td>${t.totalFeedback || 0}</td>
            </tr>
          `;
        });
      } else {
        const feedback = data as Feedback[];
        htmlContent += `
          <tr>
            <th>Student Name</th>
            <th>Rating</th>
            <th>Comment</th>
            <th>Subject</th>
            <th>Date</th>
          </tr>
        `;
        feedback.forEach((f) => {
          htmlContent += `
            <tr>
              <td>${f.studentName}</td>
              <td>${f.rating}</td>
              <td>${(f.comment || "").substring(0, 100)}</td>
              <td>${f.subject || ""}</td>
              <td>${f.createdAt ? new Date(f.createdAt).toLocaleDateString() : ""}</td>
            </tr>
          `;
        });
      }

      htmlContent += `
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
      }

      toast({
        title: "PDF generated!",
        description: "The report is ready to print or save as PDF",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting || data.length === 0}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV} disabled={isExporting}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF} disabled={isExporting}>
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

