import { Button } from "@/components/ui/button";
import { Edit, Save, X } from "lucide-react";

interface ProfileHeaderProps {
  isEditing: boolean;
  saving: boolean;
  onEditToggle: () => void;
  onSave: () => void;
}

export function ProfileHeader({
  isEditing,
  saving,
  onEditToggle,
  onSave,
}: ProfileHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Profile Information</h1>
        <p className="text-muted-foreground">Manage your profile details</p>
      </div>
      <div className="flex gap-2">
        {isEditing ? (
          <>
            <Button onClick={onSave} size="sm" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button onClick={onEditToggle} variant="outline" size="sm" disabled={saving}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </>
        ) : (
          <Button onClick={onEditToggle} variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>
    </div>
  );
}
