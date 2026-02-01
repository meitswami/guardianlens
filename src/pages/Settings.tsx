import { useState } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { User, Bell, Shield, Palette, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState({
    fullName: "",
    phone: "",
    department: "",
  });

  const [notifications, setNotifications] = useState({
    emailViolations: true,
    emailReports: false,
    browserAlerts: true,
  });

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.fullName,
          phone: profile.phone,
          department: profile.department,
        })
        .eq("user_id", user?.id);

      if (error) throw error;
      toast({ title: "Profile updated successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    toast({ title: "Password reset email sent", description: "Check your inbox for instructions" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ""} disabled />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="Enter your phone number"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                  placeholder="Enter your department"
                />
              </div>
              <Button onClick={handleUpdateProfile} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Violation Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications for new violations
                  </p>
                </div>
                <Switch
                  checked={notifications.emailViolations}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, emailViolations: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Report Summaries</p>
                  <p className="text-sm text-muted-foreground">
                    Receive weekly report summaries via email
                  </p>
                </div>
                <Switch
                  checked={notifications.emailReports}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, emailReports: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Browser Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Show real-time alerts in the browser
                  </p>
                </div>
                <Switch
                  checked={notifications.browserAlerts}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, browserAlerts: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Change Password</h4>
                <p className="text-sm text-muted-foreground">
                  We'll send you an email with instructions to reset your password
                </p>
                <Button variant="outline" onClick={handleChangePassword}>
                  Send Password Reset Email
                </Button>
              </div>
              <div className="pt-4 border-t">
                <h4 className="font-medium text-destructive">Danger Zone</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Permanently delete your account and all associated data
                </p>
                <Button variant="destructive" className="mt-2">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Select your preferred color scheme
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setTheme("light")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:bg-accent",
                      theme === "light" ? "border-primary bg-accent" : "border-muted"
                    )}
                  >
                    <div className="h-12 w-12 rounded-full bg-white border flex items-center justify-center shadow-sm">
                      <Sun className="h-6 w-6 text-yellow-500" />
                    </div>
                    <span className="text-sm font-medium">Light</span>
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:bg-accent",
                      theme === "dark" ? "border-primary bg-accent" : "border-muted"
                    )}
                  >
                    <div className="h-12 w-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                      <Moon className="h-6 w-6 text-slate-300" />
                    </div>
                    <span className="text-sm font-medium">Dark</span>
                  </button>
                  <button
                    onClick={() => setTheme("system")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:bg-accent",
                      theme === "system" ? "border-primary bg-accent" : "border-muted"
                    )}
                  >
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-white to-slate-900 border flex items-center justify-center">
                      <Monitor className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-sm font-medium">System</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Preview</h4>
                <div className="flex gap-4">
                  <div className="flex-1 p-4 rounded-lg bg-card border">
                    <div className="h-4 w-3/4 rounded bg-muted mb-2" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                  <div className="flex-1 p-4 rounded-lg bg-primary text-primary-foreground">
                    <div className="h-4 w-3/4 rounded bg-primary-foreground/20 mb-2" />
                    <div className="h-3 w-1/2 rounded bg-primary-foreground/20" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
