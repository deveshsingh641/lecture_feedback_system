import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, User, Clock, Mail, BookOpen } from "lucide-react";
import type { Teacher } from "@shared/schema";

export default function EditTeacherProfile() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: teacher, isLoading } = useQuery<Teacher>({
    queryKey: [`/api/teachers/${id}`],
  });

  const [formData, setFormData] = useState({
    bio: "",
    profileImage: "",
    officeHours: "",
    contactInfo: "",
    teachingPhilosophy: "",
  });

  // Initialize form when teacher data loads
  useEffect(() => {
    if (teacher) {
      setFormData({
        bio: teacher.bio || "",
        profileImage: teacher.profileImage || "",
        officeHours: teacher.officeHours || "",
        contactInfo: teacher.contactInfo || "",
        teachingPhilosophy: teacher.teachingPhilosophy || "",
      });
    }
  }, [teacher]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("PUT", `/api/teachers/${id}/profile`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teachers/${id}`] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      navigate(`/teacher/${id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Teacher not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user can edit (simplified - in production, link teacher to user)
  const canEdit = user?.role === "admin" || user?.role === "teacher";

  if (!canEdit) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">You don't have permission to edit this profile</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/teacher/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Profile</h1>
          <p className="text-muted-foreground mt-1">Update your teacher profile information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>Update your profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Bio / About</Label>
              <Textarea
                id="bio"
                placeholder="Tell students about yourself, your background, and teaching experience..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="min-h-[120px] resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{formData.bio.length}/500 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profileImage">Profile Image URL</Label>
              <Input
                id="profileImage"
                type="url"
                placeholder="https://example.com/profile.jpg"
                value={formData.profileImage}
                onChange={(e) => setFormData({ ...formData, profileImage: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Enter a URL to your profile image</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Office Hours & Contact
            </CardTitle>
            <CardDescription>When and how students can reach you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="officeHours">Office Hours</Label>
              <Input
                id="officeHours"
                placeholder="Monday-Friday, 2:00 PM - 4:00 PM"
                value={formData.officeHours}
                onChange={(e) => setFormData({ ...formData, officeHours: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactInfo">Contact Information</Label>
              <Input
                id="contactInfo"
                placeholder="Email: teacher@university.edu | Phone: (555) 123-4567"
                value={formData.contactInfo}
                onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Teaching Philosophy
            </CardTitle>
            <CardDescription>Share your approach to teaching and education</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teachingPhilosophy">Teaching Philosophy</Label>
              <Textarea
                id="teachingPhilosophy"
                placeholder="Describe your teaching methods, values, and what students can expect..."
                value={formData.teachingPhilosophy}
                onChange={(e) => setFormData({ ...formData, teachingPhilosophy: e.target.value })}
                className="min-h-[150px] resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">{formData.teachingPhilosophy.length}/1000 characters</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/teacher/${id}`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

