import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function httpError(status: number, message: string) {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeObjectId(value: unknown, label: string) {
  if (typeof value !== 'string' || !mongoose.Types.ObjectId.isValid(value)) {
    throw httpError(400, `Invalid ${label}`);
  }
  return new mongoose.Types.ObjectId(value);
}

function normalizeString(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw httpError(400, `${label} is required`);
  }
  return value.trim();
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) {
    throw httpError(400, 'Activity payload is required');
  }

  const userId = normalizeObjectId(input.userId, 'userId');
  const teamId = normalizeObjectId(input.teamId, 'teamId');
  const type = normalizeString(input.type, 'Type');
  const minutes = Number(input.minutes);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw httpError(400, 'Minutes must be a positive number');
  }

  const [user, team] = await Promise.all([
    User.findById(userId),
    Team.findById(teamId),
  ]);

  if (!user || !team) {
    throw httpError(404, 'User or team not found');
  }

  const created = await Activity.create({
    user: userId,
    team: teamId,
    type,
    minutes,
    points: Math.max(1, Math.round(minutes)),
    occurredAt: new Date(),
  });

  return created.toObject();
}

export async function listTeams() {
  return Team.find().sort({ name: 1 }).lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) {
    throw httpError(400, 'Team payload is required');
  }

  const name = normalizeString(input.name, 'Name');
  const mascot = normalizeString(input.mascot, 'Mascot');

  const membersValue = input.members ?? [];
  if (!Array.isArray(membersValue)) {
    throw httpError(400, 'Members must be an array');
  }

  const members = membersValue.map((member) => normalizeObjectId(member, 'member'));
  const created = await Team.create({ name, mascot, members });
  return created.toObject();
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
  ]);

  if (totals.length === 0) {
    return [];
  }

  const teamIds = totals.map((entry) => entry._id);
  const teams = await Team.find({ _id: { $in: teamIds } }).lean();
  const teamMap = new Map(teams.map((team) => [team._id.toString(), team.name]));

  return totals.map((entry, index) => ({
    teamName: teamMap.get(entry._id.toString()) ?? 'Unknown team',
    totalPoints: entry.totalPoints,
    rank: index + 1,
  }));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function suggestWorkouts(userEmail: string) {
  const normalizedEmail = typeof userEmail === 'string' ? userEmail.trim() : '';
  if (!normalizedEmail) {
    throw httpError(400, 'User email is required');
  }

  const user = await User.findOne({ email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: 'i' } }).lean();
  if (!user) {
    throw httpError(404, 'User not found');
  }

  const recentActivities = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean();
  const recentType = recentActivities[0]?.type?.toLowerCase() ?? '';
  const primaryFocus = (user.fitnessGoal ?? recentType ?? 'general').toLowerCase();

  const workouts = await Workout.find().lean();
  if (workouts.length === 0) {
    return [];
  }

  const ranked = [...workouts].sort((left, right) => {
    const leftScore = Number(left.focus?.toLowerCase() === primaryFocus) * 3 + Number(left.focus?.toLowerCase() === recentType) * 2;
    const rightScore = Number(right.focus?.toLowerCase() === primaryFocus) * 3 + Number(right.focus?.toLowerCase() === recentType) * 2;
    return rightScore - leftScore;
  });

  return ranked.map((workout) => ({
    ...workout,
    reason: `Builds on your recent ${recentType || primaryFocus} activity and ${primaryFocus} goal.`,
  }));
}

export { User };
