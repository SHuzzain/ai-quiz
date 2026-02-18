import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, RefreshCw, Save, User as UserIcon, Upload } from "lucide-react";
import { ImageCropper } from "@/components/ui/ImageCropper";
import { uploadAvatar } from "@/services/api";

export function ProfilePage() {
    const { user, updateProfile } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || "",
        avatarUrl: user?.avatarUrl || "",
    });

    // Cropper state
    const [file, setFile] = useState<File | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const generateNewAvatar = () => {
        const seed = Math.random().toString(36).substring(7);
        const newAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
        setFormData({ ...formData, avatarUrl: newAvatarUrl });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            const reader = new FileReader();
            reader.addEventListener("load", () => {
                setImageSrc(reader.result?.toString() || null);
                setIsCropperOpen(true);
            });
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleCropComplete = async (croppedImageBlob: Blob) => {
        setIsCropperOpen(false);
        setIsLoading(true);

        try {
            // Create a File from the Blob
            const fileToUpload = new File([croppedImageBlob], "avatar.jpg", { type: "image/jpeg" });
            const publicUrl = await uploadAvatar(fileToUpload);

            setFormData({ ...formData, avatarUrl: publicUrl });

            // Update profile immediately with new avatar
            await updateProfile({
                name: formData.name,
                avatarUrl: publicUrl,
            });

            toast({
                title: "Avatar updated",
                description: "Your new profile picture has been uploaded.",
            });
        } catch (error) {
            toast({
                title: "Upload failed",
                description: "Failed to upload avatar image.",
                variant: "destructive",
            });
            console.error(error);
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await updateProfile({
                name: formData.name,
                avatarUrl: formData.avatarUrl,
            });

            toast({
                title: "Profile updated",
                description: "Your profile has been updated successfully.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update profile. Please try again.",
                variant: "destructive",
            });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="container max-w-2xl mx-auto py-8 px-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Profile Settings</CardTitle>
                    <CardDescription>
                        Manage your account settings and preferences.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="flex flex-col items-center space-y-4">
                            <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                                <AvatarImage src={formData.avatarUrl} className="object-cover" />
                                <AvatarFallback>
                                    <UserIcon className="w-12 h-12" />
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    Upload Photo
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={generateNewAvatar}
                                    className="flex items-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Generate Random
                                </Button>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>

                        {imageSrc && (
                            <ImageCropper
                                imageSrc={imageSrc}
                                open={isCropperOpen}
                                onCropComplete={handleCropComplete}
                                onCancel={() => {
                                    setIsCropperOpen(false);
                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                }}
                            />
                        )}

                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    value={user.email}
                                    disabled
                                    className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Email cannot be changed directly.
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter your name"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>Role</Label>
                                <div className="flex">
                                    <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-sm font-medium capitalize">
                                        {user.role}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="button" variant="outline" className="mr-2" onClick={() => setFormData({ name: user.name, avatarUrl: user.avatarUrl || "" })}>
                                Reset
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
