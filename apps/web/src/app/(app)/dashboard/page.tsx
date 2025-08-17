"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit, Save, X, Camera } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { APIResponse } from "@/types/apiResponse";
import { ChannelPayload } from "@/types/channel";

export default function DashboardPage() {
  const { user } = useUser();
  const [channelData, setChannelData] = useState<ChannelPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<{ avatar: boolean; banner: boolean }>({
    avatar: false,
    banner: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: "",
    bio: "",
    category: "",
    slug: "",
  });
  const [pendingUploads, setPendingUploads] = useState<{
    avatarS3Key?: string;
    bannerS3Key?: string;
  }>({});

  // Fetch channel data
  useEffect(() => {
    const fetchChannelData = async () => {
      try {
        const response = await axios.get<APIResponse<ChannelPayload>>("/api/channel");
        const { data } = response;

        if (data.success && data.payload) {
          setChannelData(data.payload);
          setEditForm({
            displayName: data.payload.channel.displayName || "",
            bio: data.payload.channel.bio || "",
            category: data.payload.channel.category || "",
            slug: data.payload.channel.slug || "",
          });
        } else {
          setError(data.message || "Failed to fetch channel data");
        }
      } catch (err) {
        console.error("Error fetching channel data:", err);
        if (axios.isAxiosError(err)) {
          const errorMessage = err.response?.data?.message || err.message;
          setError(`Network error: ${errorMessage}`);
        } else {
          setError("Network error while fetching channel data");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchChannelData();
  }, []);

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form to original values
      if (channelData) {
        setEditForm({
          displayName: channelData.channel.displayName || "",
          bio: channelData.channel.bio || "",
          category: channelData.channel.category || "",
          slug: channelData.channel.slug || "",
        });
      }
      // Clear pending uploads
      setPendingUploads({});
      setError(null);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Basic validation - match the schema requirements
      if (editForm.slug && !/^[a-z0-9-]+$/.test(editForm.slug)) {
        setError("Channel URL can only contain lowercase letters, numbers, and hyphens");
        return;
      }

      const response = await axios.patch<APIResponse<ChannelPayload>>("/api/channel", {
        ...editForm,
        ...pendingUploads,
      });
      const { data } = response;

      if (data.success && data.payload) {
        setChannelData(data.payload);
        setIsEditing(false);
        setPendingUploads({}); // Clear pending uploads
        // Show success message (you can add a toast here if you have one)
        console.log("Profile updated successfully!");
      } else {
        setError(data.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || err.message;
        setError(`Update failed: ${errorMessage}`);
      } else {
        setError("Network error while updating profile");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    // Auto-convert slug to lowercase and remove invalid characters
    if (field === 'slug') {
      value = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    }
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (file: File, type: 'avatar' | 'banner') => {
    try {
      setUploading(prev => ({ ...prev, [type]: true }));
      setError(null);

      // Validate file
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const maxSize = type === 'avatar' ? 2 * 1024 * 1024 : 5 * 1024 * 1024; // 2MB for avatar, 5MB for banner

      if (!validTypes.includes(file.type)) {
        throw new Error('Only JPEG, PNG, and WebP images are allowed');
      }

      if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        throw new Error(`File size must be less than ${maxSizeMB}MB`);
      }

      // Get signed URL
      const signedUrlResponse = await axios.post<APIResponse<{
        key: string;
        url: string;
        headers: Record<string, string>;
        maxSize: number;
        expiresIn: number;
        type: string;
      }>>('/api/upload/signed-url', {
        type,
        contentType: file.type,
      });

      if (!signedUrlResponse.data.success || !signedUrlResponse.data.payload) {
        throw new Error(signedUrlResponse.data.message || 'Failed to get upload URL');
      }

      const { url, key, headers } = signedUrlResponse.data.payload;

      // Upload file to S3
      await axios.put(url, file, {
        headers,
      });

      // Store the S3 key for later save
      setPendingUploads(prev => ({ ...prev, [`${type}S3Key`]: key }));

      console.log(`${type} uploaded successfully:`, key);
    } catch (err) {
      console.error(`Error uploading ${type}:`, err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || err.message;
        setError(`Upload failed: ${errorMessage}`);
      } else {
        setError(err instanceof Error ? err.message : `Failed to upload ${type}`);
      }
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleImageClick = (type: 'avatar' | 'banner') => {
    if (!isEditing) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file, type);
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        <div className="animate-pulse">
          <Card>
            <CardContent className="p-6">
              <div className="h-32 bg-muted rounded-lg mb-4"></div>
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-destructive">
              <p>Error: {error}</p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!channelData) {
    return null;
  }

  const { channel, assets } = channelData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile Information</h1>
          <p className="text-muted-foreground">Manage your profile details</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleSave} size="sm" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button onClick={handleEditToggle} variant="outline" size="sm" disabled={saving}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={handleEditToggle} variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="space-y-6 p-8">
          {/* Banner Section */}
          <div className="relative">
            <div
              className={`h-32 bg-cover bg-center rounded-lg ${isEditing ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
              style={{ backgroundImage: `url(${assets.bannerUrl})` }}
              onClick={() => handleImageClick('banner')}
            >
              {isEditing && (
                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center group-hover:bg-black/60 transition-colors">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/90 hover:bg-white text-black"
                    disabled={uploading.banner}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {uploading.banner ? 'Uploading...' : 'Change Banner'}
                  </Button>
                </div>
              )}
            </div>

            {/* Avatar */}
            <div className="absolute -bottom-6 left-6">
              <div
                className="relative"
                onClick={() => handleImageClick('avatar')}
              >
                <Avatar className={`w-20 h-20 border-4 border-background ${isEditing ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}>
                  <AvatarImage src={assets.avatarUrl} />
                  <AvatarFallback className="text-lg">
                    {channel.displayName?.[0] || user?.firstName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-white hover:bg-gray-50 text-black border border-gray-200"
                    disabled={uploading.avatar}
                  >
                    <Camera className="w-3 h-3" />
                  </Button>
                )}
                {uploading.avatar && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="text-white text-xs">Uploading...</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Profile Details */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Display Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Name</label>
                {isEditing ? (
                  <Input
                    value={editForm.displayName}
                    onChange={(e) => handleInputChange("displayName", e.target.value)}
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
                        onChange={(e) => handleInputChange("slug", e.target.value)}
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
                    onChange={(e) => handleInputChange("category", e.target.value)}
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

            {/* Bio */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Bio</label>
              {isEditing ? (
                <textarea
                  value={editForm.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
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
        </CardContent>
      </Card>


    </div>
  );
}
