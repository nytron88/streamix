import { Button } from "@/components/ui/button";
import { Edit, Save, X } from "lucide-react";

interface ProfileHeaderProps {
  isEditing: boolean;
  saving: boolean;
  canceling?: boolean;
  hasChanges?: boolean;
  onEditToggle: () => void;
  onSave: () => void;
}

export function ProfileHeader({
  isEditing,
  saving,
  canceling = false,
  hasChanges = false,
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
            <Button 
              onClick={onSave} 
              size="sm" 
              disabled={saving || !hasChanges} 
              className="cursor-pointer"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
            </Button>
            <Button 
              onClick={onEditToggle} 
              variant="outline" 
              size="sm" 
              disabled={saving || canceling} 
              className="cursor-pointer"
            >
              <X className="w-4 h-4 mr-2" />
              {canceling ? "Canceling..." : "Cancel"}
            </Button>
          </>
        ) : (
          <Button onClick={onEditToggle} variant="outline" size="sm" className="cursor-pointer">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>
    </div>
  );
}
