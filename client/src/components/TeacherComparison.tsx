import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./StarRating";
import { X, Users, MessageSquare, Star, TrendingUp, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Teacher } from "@shared/schema";

interface TeacherComparisonProps {
  teachers: Teacher[];
  onRemove: (teacherId: string) => void;
  className?: string;
}

export function TeacherComparison({ teachers, onRemove, className }: TeacherComparisonProps) {
  if (teachers.length === 0) {
    return null;
  }

  const maxRating = Math.max(...teachers.map((t) => t.averageRating || 0));
  const maxFeedback = Math.max(...teachers.map((t) => t.totalFeedback || 0));

  return (
    <Card className={cn("animate-fadeIn", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Teacher Comparison ({teachers.length} selected)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Teacher</th>
                <th className="text-center p-2">Rating</th>
                <th className="text-center p-2">Feedback</th>
                <th className="text-center p-2">Department</th>
                <th className="text-center p-2">Subject</th>
                <th className="text-center p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher, index) => (
                <tr
                  key={teacher.id}
                  className={cn(
                    "border-b hover:bg-muted/50 transition-colors",
                    (teacher.averageRating || 0) === maxRating && "bg-yellow-500/5"
                  )}
                >
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{teacher.name}</div>
                      {(teacher.averageRating || 0) === maxRating && (
                        <Badge variant="secondary" className="text-xs">
                          <Award className="h-3 w-3 mr-1" />
                          Top
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-2 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <StarRating rating={Math.round(teacher.averageRating || 0)} size="sm" />
                      <span className="text-xs font-medium">
                        {(teacher.averageRating || 0).toFixed(1)}
                      </span>
                    </div>
                  </td>
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{teacher.totalFeedback || 0}</span>
                    </div>
                  </td>
                  <td className="p-2 text-center">
                    <Badge variant="outline" className="text-xs">
                      {teacher.department}
                    </Badge>
                  </td>
                  <td className="p-2 text-center text-sm text-muted-foreground">
                    {teacher.subject}
                  </td>
                  <td className="p-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(teacher.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {(teachers.reduce((sum, t) => sum + (t.averageRating || 0), 0) / teachers.length).toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Avg Rating</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {teachers.reduce((sum, t) => sum + (t.totalFeedback || 0), 0)}
            </div>
            <div className="text-xs text-muted-foreground">Total Feedback</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {new Set(teachers.map((t) => t.department)).size}
            </div>
            <div className="text-xs text-muted-foreground">Departments</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

