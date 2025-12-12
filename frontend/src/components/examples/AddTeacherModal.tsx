import { useState } from "react";
import { AddTeacherModal } from "../AddTeacherModal";
import { Button } from "@/components/ui/button";

export default function AddTeacherModalExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-4">
      <Button onClick={() => setOpen(true)}>Add Teacher</Button>
      <AddTeacherModal
        open={open}
        onOpenChange={setOpen}
        onSubmit={(data) => console.log("Teacher added:", data)}
      />
    </div>
  );
}
