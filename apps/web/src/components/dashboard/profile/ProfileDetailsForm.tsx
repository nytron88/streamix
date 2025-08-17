import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Channel } from "@prisma/client";

interface EditForm {
  displayName: string;
  bio: string;
  category: string;
  slug: string;
}

interface ProfileDetailsFormProps {
  channel: Channel;
  isEditing: boolean;
  editForm: EditForm;
  onInputChange: (field: keyof EditForm, value: string) => void;
}

export function ProfileDetailsForm({
  channel,
  isEditing,
  editForm,
  onInputChange,
}: ProfileDetailsFormProps) {
  return (
    <div className="space-y-6">
      {/* Basic Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Display Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Display Name</label>
          {isEditing ? (
            <Input
              value={editForm.displayName}
              onChange={(e) => onInputChange("displayName", e.target.value)}
              placeholder="Enter display name"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {channel.displayName || "No display name set"}
            </p>
          )}
        </div>

        {/* Channel Slug */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Channel URL</label>
          {isEditing ? (
            <div className="space-y-1">
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                  /channel/
                </span>
                <Input
                  value={editForm.slug}
                  onChange={(e) => onInputChange("slug", e.target.value)}
                  placeholder="your-channel-name"
                  className="rounded-l-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Only lowercase letters, numbers, and hyphens allowed
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {channel.slug ? `/channel/${channel.slug}` : "No custom URL set"}
            </p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          {isEditing ? (
            <Input
              value={editForm.category}
              onChange={(e) => onInputChange("category", e.target.value)}
              placeholder="e.g. Gaming, Music, Art"
            />
          ) : (
            <div>
              {channel.category ? (
                <Badge variant="secondary">{channel.category}</Badge>
              ) : (
                <p className="text-sm text-muted-foreground">No category set</p>
              )}
            </div>
          )}
        </div>

        {/* Account Created */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Member Since</label>
          <p className="text-sm text-muted-foreground">
            {new Date(channel.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric"
            })}
          </p>
        </div>
      </div>

      {/* Bio - Full Width */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Bio</label>
        {isEditing ? (
          <textarea
            value={editForm.bio}
            onChange={(e) => onInputChange("bio", e.target.value)}
            placeholder="Tell viewers about yourself..."
            rows={3}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {channel.bio || "No bio added yet"}
          </p>
        )}
      </div>
    </div>
  );
}
