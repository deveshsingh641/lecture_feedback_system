import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddTeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; department: string; subject: string }) => void;
  isSubmitting?: boolean;
}

const DEPARTMENTS = [
  "Computer Science",
  "Electronics",
  "Mechanical",
  "Civil",
  "Information Technology",
];

export function AddTeacherModal({ open, onOpenChange, onSubmit, isSubmitting = false }: AddTeacherModalProps) {
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [subject, setSubject] = useState("");

  const trimmedName = name.trim();
  const trimmedDepartment = department.trim();
  const trimmedSubject = subject.trim();

  const isNameValid = trimmedName.length >= 2 && trimmedName.toLowerCase() !== "name";
  const isFormValid = isNameValid && trimmedDepartment.length > 0 && trimmedSubject.length > 0;

  useEffect(() => {
    if (!open) {
      setName("");
      setDepartment("");
      setSubject("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (!isFormValid) return;
    onSubmit({ name: trimmedName, department: trimmedDepartment, subject: trimmedSubject });
  };

  const handleClose = () => {
    setName("");
    setDepartment("");
    setSubject("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title-add-teacher">Add New Teacher</DialogTitle>
          <DialogDescription>
            Enter the teacher's details to add them to the system
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="teacher-name">Full Name</Label>
            <Input
              id="teacher-name"
              placeholder="Enter teacher's full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-teacher-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger id="department" data-testid="select-department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Enter subject taught"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              data-testid="input-subject"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel-add">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            data-testid="button-submit-add-teacher"
          >
            {isSubmitting ? "Adding..." : "Add Teacher"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
