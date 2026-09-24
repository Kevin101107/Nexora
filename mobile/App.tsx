import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { API_URL, getApi } from "./src/api";
import { NotificationResponse, Project, Recommendation, User } from "./src/types";
import { colors } from "./src/theme";

type Tab = "home" | "discover" | "projects" | "inbox" | "profile";
type IconName = React.ComponentProps<typeof Ionicons>["name"];

const tabs: { key: Tab; label: string; icon: IconName; active: IconName }[] = [
  { key: "home", label: "Home", icon: "grid-outline", active: "grid" },
  { key: "discover", label: "Discover", icon: "compass-outline", active: "compass" },
  { key: "projects", label: "Projects", icon: "folder-outline", active: "folder" },
  { key: "inbox", label: "Inbox", icon: "notifications-outline", active: "notifications" },
  { key: "profile", label: "Profile", icon: "person-outline", active: "person" },
];

function Pill({ children, tone = "purple" }: { children: React.ReactNode; tone?: "purple" | "green" | "amber" }) {
  const color = tone === "green" ? colors.success : tone === "amber" ? colors.warning : colors.primary;
  return <View style={[styles.pill, { backgroundColor: `${color}20` }]}><Text style={[styles.pillText, { color }]}>{children}</Text></View>;
}

function Empty({ message }: { message: string }) {
  return <View style={styles.empty}><Ionicons name="sparkles-outline" size={28} color={colors.primary} /><Text style={styles.emptyText}>{message}</Text></View>;
}

function ProjectCard({ project }: { project: Project }) {
  return <View style={styles.card}>
    <View style={styles.rowBetween}><Pill>{project.category.replace("_", " ")}</Pill><Text style={styles.mini}>{project.open_roles_count} roles open</Text></View>
    <Text style={styles.cardTitle}>{project.title}</Text>
    <Text style={styles.body} numberOfLines={3}>{project.description}</Text>
    <View style={styles.divider} />
    <Text style={styles.mini}>{project.members_count} builders · {project.status}</Text>
  </View>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [notifications, setNotifications] = useState<NotificationResponse>({ notifications: [], unread_count: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [nextUser, nextProjects, nextMatches, nextNotifications] = await Promise.all([
        getApi<User>("/users/me"),
        getApi<Project[]>("/projects"),
        getApi<Recommendation[]>("/matches/me/roles?limit=10"),
        getApi<NotificationResponse>("/notifications?limit=30"),
      ]);
      setUser(nextUser); setProjects(nextProjects); setRecommendations(nextMatches); setNotifications(nextNotifications);
    } catch {
      setError(`Cannot reach Nexora at ${API_URL}. Start the backend and set EXPO_PUBLIC_API_URL to this computer's LAN address when testing on a phone.`);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const refresh = () => { setRefreshing(true); void load(); };

  const header = <View style={styles.header}><View><Text style={styles.brand}>Nexora<Text style={{ color: colors.primary }}>.</Text></Text><Text style={styles.mini}>Build Better Together</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>{user?.display_name?.[0] ?? "N"}</Text></View></View>;

  let content: React.ReactNode;
  if (loading) content = <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  else if (error) content = <View style={styles.center}><Ionicons name="cloud-offline-outline" size={38} color={colors.warning} /><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => { setLoading(true); void load(); }} style={styles.button}><Text style={styles.buttonText}>Try again</Text></Pressable></View>;
  else if (tab === "home") content = <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />} contentContainerStyle={styles.content}>
    <Pill tone="green">MATCH SCORE V2 ACTIVE</Pill><Text style={styles.title}>Welcome back, {user?.display_name ?? "Builder"} 👋</Text><Text style={styles.subtitle}>Find compatible teammates and turn ideas into shipped projects.</Text>
    <View style={styles.stats}><View style={styles.stat}><Text style={styles.statNumber}>{projects.length}</Text><Text style={styles.mini}>Projects</Text></View><View style={styles.stat}><Text style={styles.statNumber}>{recommendations.length}</Text><Text style={styles.mini}>Matches</Text></View><View style={styles.stat}><Text style={styles.statNumber}>{notifications.unread_count}</Text><Text style={styles.mini}>Unread</Text></View></View>
    <Text style={styles.sectionTitle}>Recommended opportunities</Text>{recommendations.slice(0, 3).map((item) => <View key={item.role.id} style={styles.card}><View style={styles.rowBetween}><Pill tone={item.match.score >= 75 ? "green" : "amber"}>{Math.round(item.match.score)}% MATCH</Pill><Text style={styles.mini}>{item.match.evidence_quality} evidence</Text></View><Text style={styles.cardTitle}>{item.role.role_name}</Text><Text style={styles.link}>{item.project.title}</Text><View style={styles.tagRow}>{item.match.matched_skills.slice(0, 4).map(skill => <Pill key={skill}>{skill}</Pill>)}</View></View>)}
  </ScrollView>;
  else if (tab === "discover") content = <FlatList data={recommendations} keyExtractor={item => item.role.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />} contentContainerStyle={styles.content} ListHeaderComponent={<><Text style={styles.title}>Discover</Text><Text style={styles.subtitle}>Roles ranked by skills, experience, availability, reliability, and project history.</Text></>} ListEmptyComponent={<Empty message="No recommended roles yet." />} renderItem={({ item }) => <View style={styles.card}><View style={styles.rowBetween}><Pill tone={item.match.score >= 75 ? "green" : "amber"}>{Math.round(item.match.score)}% · {item.match.score_label}</Pill><Text style={styles.mini}>{item.project.category}</Text></View><Text style={styles.cardTitle}>{item.role.role_name}</Text><Text style={styles.link}>{item.project.title}</Text><Text style={styles.label}>MATCHED SKILLS</Text><View style={styles.tagRow}>{item.match.matched_skills.map(skill => <Pill key={skill}>{skill}</Pill>)}</View></View>} />;
  else if (tab === "projects") content = <FlatList data={projects} keyExtractor={item => item.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />} contentContainerStyle={styles.content} ListHeaderComponent={<><Text style={styles.title}>Explore Projects</Text><Text style={styles.subtitle}>Student projects and squads recruiting builders.</Text></>} ListEmptyComponent={<Empty message="No projects are recruiting yet." />} renderItem={({ item }) => <ProjectCard project={item} />} />;
  else if (tab === "inbox") content = <FlatList data={notifications.notifications} keyExtractor={item => item.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />} contentContainerStyle={styles.content} ListHeaderComponent={<><View style={styles.rowBetween}><Text style={styles.title}>Inbox</Text><Pill>{notifications.unread_count} UNREAD</Pill></View><Text style={styles.subtitle}>Invitations, assignments, and milestones.</Text></>} ListEmptyComponent={<Empty message="You're all caught up." />} renderItem={({ item }) => <View style={[styles.card, !item.is_read && styles.unread]}><View style={styles.rowBetween}><Text style={styles.cardTitle}>{item.title}</Text>{!item.is_read && <View style={styles.dot} />}</View><Text style={styles.body}>{item.message}</Text></View>} />;
  else content = <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />} contentContainerStyle={styles.content}><Text style={styles.title}>Builder Profile</Text><View style={[styles.card, styles.profile]}><View style={styles.largeAvatar}><Text style={styles.largeAvatarText}>{user?.display_name?.[0] ?? "N"}</Text></View><Text style={styles.title}>{user?.display_name}</Text><Text style={styles.link}>@{user?.username}</Text><Pill tone="green">{user?.availability.replaceAll("_", " ")}</Pill><Text style={styles.subtitle}>{user?.headline}</Text><Text style={styles.label}>PRIMARY ROLES</Text><View style={styles.tagRow}>{user?.roles.map(role => <Pill key={role}>{role}</Pill>)}</View><Text style={styles.label}>SKILLS</Text><View style={styles.tagRow}>{user?.skills.map(skill => <Pill key={skill}>{skill}</Pill>)}</View></View></ScrollView>;

  return <SafeAreaView style={styles.safe}><StatusBar style="light" />{header}<View style={styles.main}>{content}</View><View style={styles.tabBar}>{tabs.map(item => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }} onPress={() => setTab(item.key)} style={styles.tab}><Ionicons name={tab === item.key ? item.active : item.icon} size={22} color={tab === item.key ? colors.primary : colors.muted} /><Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text>{item.key === "inbox" && notifications.unread_count > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{notifications.unread_count}</Text></View>}</Pressable>)}</View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, main: { flex: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 18 },
  header: { height: 72, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.border }, brand: { color: colors.text, fontSize: 22, fontWeight: "800" },
  avatar: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft }, avatarText: { color: colors.primary, fontWeight: "800" }, content: { padding: 20, paddingBottom: 36, gap: 14 },
  title: { color: colors.text, fontSize: 27, lineHeight: 34, fontWeight: "800" }, subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 4 }, sectionTitle: { color: colors.text, fontSize: 19, fontWeight: "700", marginTop: 10 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 22, padding: 18, gap: 10 }, unread: { borderColor: "rgba(108,99,255,0.5)" }, cardTitle: { color: colors.text, fontSize: 17, fontWeight: "700", flexShrink: 1 }, body: { color: colors.muted, fontSize: 13, lineHeight: 20 }, link: { color: colors.primary, fontSize: 13, fontWeight: "600" }, mini: { color: colors.muted, fontSize: 11, textTransform: "capitalize" }, label: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.7, marginTop: 10 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, divider: { height: 1, backgroundColor: colors.border }, tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, pill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }, pillText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  stats: { flexDirection: "row", gap: 10, marginVertical: 8 }, stat: { flex: 1, backgroundColor: colors.surfaceRaised, borderRadius: 18, padding: 14, gap: 4 }, statNumber: { color: colors.text, fontSize: 23, fontWeight: "800" },
  empty: { alignItems: "center", padding: 32, gap: 12 }, emptyText: { color: colors.muted, textAlign: "center" }, error: { color: colors.muted, textAlign: "center", lineHeight: 20 }, button: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 }, buttonText: { color: "white", fontWeight: "700" },
  profile: { alignItems: "center", paddingVertical: 28 }, largeAvatar: { width: 82, height: 82, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft }, largeAvatarText: { color: colors.primary, fontWeight: "800", fontSize: 30 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary }, tabBar: { minHeight: 68, paddingBottom: 6, flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: "#12121e" }, tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, position: "relative" }, tabText: { color: colors.muted, fontSize: 10, fontWeight: "600" }, tabTextActive: { color: colors.primary }, badge: { position: "absolute", top: 8, right: 14, minWidth: 17, height: 17, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary }, badgeText: { color: "white", fontSize: 9, fontWeight: "800" },
});
