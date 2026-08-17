import { GameState, Player, Team, Manager, District, Match, DistrictManagerInvite } from '../types';

const awardDistrictTeamTitle = (team: Team | undefined, season: number) => {
    if (!team) return;

    const titles = team.titles || { league: 0, cup: 0, total: 0 };
    titles.cup += 1;
    titles.total += 1;
    team.titles = titles;

    const title = `Campeão da Copa de Distritos (${team.district})`;
    team.achievements = team.achievements || [];
    if (!team.achievements.some(achievement => achievement.season === season && achievement.title === title)) {
        team.achievements.unshift({
            season,
            title,
            type: 'Distrito'
        });
    }
};

/**
 * Scores managers for the District Cup. Managers from the same origin/active
 * district get priority, but reputation and career merit still decide the call-up.
 */
const scoreDistrictManager = (state: GameState, manager: Manager, district: District) => {
    const career = manager.career;
    const activeTeam = career.currentTeamId ? state.teams[career.currentTeamId] : null;
    const sameOrigin = manager.originDistrict === district;
    const sameCurrent = manager.district === district || activeTeam?.district === district;
    const humanBonus = manager.isNPC === false || manager.id === state.userManagerId ? 30 : 0;
    const districtBonus = sameOrigin ? 28 : sameCurrent ? 16 : 0;

    return (
        (manager.reputation || 0) +
        humanBonus +
        districtBonus +
        (career.titlesWon || 0) * 8 +
        (career.totalLeagueTitles || 0) * 6 +
        (career.totalCupTitles || 0) * 5 +
        (career.hallOfFameEntries || 0) * 10
    );
};

const getDistrictManagerCandidates = (state: GameState, district: District) => (
    Object.values(state.managers || {})
        .filter(m => m && typeof m.reputation === 'number')
        .map(manager => ({
            manager,
            score: scoreDistrictManager(state, manager, district)
        }))
        .sort((a, b) => b.score - a.score)
);

const isHumanManager = (state: GameState, managerId: string) => {
    const manager = state.managers[managerId];
    return manager?.isNPC === false || managerId === state.userManagerId;
};

export const prepareDistrictCupManagerInvites = (state: GameState): GameState => {
    const season = state.world.currentSeason || 2050;
    const cup = state.world.districtCup;

    if (cup.managerInvites?.some(invite => invite.season === season)) {
        return state;
    }

    const districts: District[] = ['NORTE', 'SUL', 'LESTE', 'OESTE'];
    cup.managerInvites = cup.managerInvites || [];
    cup.managerAssignments = cup.managerAssignments || {};

    const usedManagers = new Set<string>();

    districts.forEach(district => {
        const candidates = getDistrictManagerCandidates(state, district)
            .filter(candidate => !usedManagers.has(candidate.manager.id));
        const selected = candidates[0];
        if (!selected) return;

        const status: DistrictManagerInvite['status'] = isHumanManager(state, selected.manager.id)
            ? 'PENDING'
            : 'AUTO_ACCEPTED';

        const invite: DistrictManagerInvite = {
            id: `district_invite_${season}_${district}_${selected.manager.id}`,
            season,
            district,
            managerId: selected.manager.id,
            status,
            score: selected.score,
            rank: 1,
            createdAt: state.world.currentDate,
            respondedAt: status === 'AUTO_ACCEPTED' ? state.world.currentDate : null,
            note: status === 'PENDING'
                ? `A Federacao ${district} te indicou para comandar a selecao na Copa dos Distritos.`
                : `${selected.manager.name} aceitou automaticamente pela IA.`
        };

        cup.managerInvites!.push(invite);
        if (status === 'AUTO_ACCEPTED') {
            cup.managerAssignments![district] = selected.manager.id;
            usedManagers.add(selected.manager.id);
        }
    });

    return state;
};

export const respondDistrictCupManagerInvite = (state: GameState, inviteId: string, accept: boolean): GameState => {
    const cup = state.world.districtCup;
    const invites = cup.managerInvites || [];
    const invite = invites.find(item => item.id === inviteId && item.status === 'PENDING');
    if (!invite) return state;

    invite.status = accept ? 'ACCEPTED' : 'REJECTED';
    invite.respondedAt = state.world.currentDate;
    invite.note = accept
        ? `Contrato aceito para comandar a Selecao ${invite.district}.`
        : `Convite recusado. A federacao ${invite.district} chamou o proximo nome.`;

    cup.managerAssignments = cup.managerAssignments || {};

    if (accept) {
        cup.managerAssignments[invite.district] = invite.managerId;
        return state;
    }

    const assignedManagers = new Set(Object.values(cup.managerAssignments).filter(Boolean) as string[]);
    invites
        .filter(item => item.status === 'ACCEPTED' || item.status === 'AUTO_ACCEPTED')
        .forEach(item => assignedManagers.add(item.managerId));

    const next = getDistrictManagerCandidates(state, invite.district)
        .find(candidate =>
            candidate.manager.id !== invite.managerId &&
            !assignedManagers.has(candidate.manager.id) &&
            !invites.some(item => item.season === invite.season && item.district === invite.district && item.managerId === candidate.manager.id)
        );

    if (!next) return state;

    const status: DistrictManagerInvite['status'] = isHumanManager(state, next.manager.id)
        ? 'PENDING'
        : 'AUTO_ACCEPTED';
    const nextInvite: DistrictManagerInvite = {
        id: `district_invite_${invite.season}_${invite.district}_${next.manager.id}`,
        season: invite.season,
        district: invite.district,
        managerId: next.manager.id,
        status,
        score: next.score,
        rank: invites.filter(item => item.season === invite.season && item.district === invite.district).length + 1,
        createdAt: state.world.currentDate,
        respondedAt: status === 'AUTO_ACCEPTED' ? state.world.currentDate : null,
        note: status === 'PENDING'
            ? `Voce virou o proximo nome para comandar a Selecao ${invite.district}.`
            : `${next.manager.name} assumiu depois da recusa.`
    };

    invites.push(nextInvite);
    if (status === 'AUTO_ACCEPTED') {
        cup.managerAssignments[invite.district] = next.manager.id;
    }

    return state;
};

export const selectDistrictCupManagers = (state: GameState): Record<District, string> => {
    prepareDistrictCupManagerInvites(state);

    const mapping: Partial<Record<District, string>> = { ...(state.world.districtCup.managerAssignments || {}) };
    const invites = state.world.districtCup.managerInvites || [];
    const districts: District[] = ['NORTE', 'SUL', 'LESTE', 'OESTE'];
    const usedManagers = new Set(Object.values(mapping).filter(Boolean) as string[]);

    districts.forEach(district => {
        if (mapping[district]) return;

        invites
            .filter(invite => invite.district === district && invite.status === 'PENDING')
            .forEach(invite => {
                invite.status = 'EXPIRED';
                invite.respondedAt = state.world.currentDate;
                invite.note = 'Sem resposta ate a Copa. A federacao chamou outro tecnico.';
            });

        const accepted = invites.find(invite =>
            invite.district === district &&
            (invite.status === 'ACCEPTED' || invite.status === 'AUTO_ACCEPTED') &&
            !usedManagers.has(invite.managerId)
        );

        if (accepted) {
            mapping[district] = accepted.managerId;
            usedManagers.add(accepted.managerId);
            return;
        }

        const fallback = getDistrictManagerCandidates(state, district)
            .find(candidate => !usedManagers.has(candidate.manager.id));

        if (fallback) {
            mapping[district] = fallback.manager.id;
            usedManagers.add(fallback.manager.id);
        }
    });

    state.world.districtCup.managerAssignments = mapping;
    return mapping as Record<District, string>;
};

/**
 * Convokes the 15 best players from each district.
 */
export const generateDistrictRosters = (state: GameState): Record<District, string[]> => {
    const allPlayers = Object.values(state.players);
    const rosters: Record<District, string[]> = {
        'NORTE': [], 'SUL': [], 'LESTE': [], 'OESTE': [], 'EXILADO': []
    };

    ['NORTE', 'SUL', 'LESTE', 'OESTE'].forEach(d => {
        const districtPlayers = allPlayers
            .filter(p => (p.originDistrict || p.district) === d)
            .sort((a, b) => b.totalRating - a.totalRating)
            .slice(0, 15);

        rosters[d as District] = districtPlayers.map(p => p.id);
    });

    return rosters;
};

/**
 * Initializes the District Cup state and tournament.
 */
export const initDistrictCup = (state: GameState) => {
    state.world.phase = 'DISTRICT_CUP';
    const rosters = generateDistrictRosters(state);
    const managers = selectDistrictCupManagers(state);

    // Setup the 4 District Teams (Special virtual teams)
    ['NORTE', 'SUL', 'LESTE', 'OESTE'].forEach(d => {
        const teamId = `d_${d.toLowerCase()}`;
        const existingTeam = state.teams[teamId];
        const team: Team = existingTeam ? {
            ...existingTeam,
            managerId: managers[d as District],
            squad: rosters[d as District],
            lineup: {},
            tactics: {
                ...existingTeam.tactics,
                playStyle: existingTeam.tactics?.playStyle || 'Equilibrado',
                preferredFormation: existingTeam.tactics?.preferredFormation || '4-3-3'
            }
        } : {
            id: teamId,
            name: `Seleção ${d}`,
            city: d,
            district: d as District,
            league: 'Cyan', // Dummy
            colors: { primary: '#FFD700', secondary: '#000000' },
            managerId: managers[d as District],
            squad: rosters[d as District],
            lineup: {}, // To be filled by manager
            tactics: {
                playStyle: 'Equilibrado',
                preferredFormation: '4-3-3'
            }
        };
        state.teams[teamId] = team;
    });

    // Generate Matches (Triangular: 3 rounds + Final)
    // Round 1: N vs S, L vs O
    // Round 2: N vs L, S vs O
    // Round 3: N vs O, S vs L
    // This is simplified. User asked for Triangular (3 games) + Final.
};

export const finalizeDistrictCup = (state: GameState) => {
    // 1. Award District Cup to Winner's squad
    const winnerId = state.world.districtCup.winnerId;
    if (winnerId) {
        const winnerTeam = state.teams[winnerId];
        if (winnerTeam) {
            awardDistrictTeamTitle(winnerTeam, state.world.currentSeason || 2050);

            winnerTeam.squad.forEach(pid => {
                const p = state.players[pid];
                if (p) {
                    p.achievements.push({
                        season: state.world.currentSeason || 2050,
                        title: `Campeão da Copa de Distritos (${winnerTeam.district})`,
                        type: 'Distrito'
                    });
                }
            });

            // Award to Manager
            const managerId = winnerTeam.managerId;
            if (managerId && state.managers[managerId]) {
                const m = state.managers[managerId];
                m.career.titlesWon += 1;
                m.career.totalCupTitles += 1;
                m.achievements.push({
                    season: state.world.currentSeason || 2050,
                    title: `Campeão da Copa de Distritos (${winnerTeam.district})`,
                    type: 'Distrito'
                });
            }
        }
    }

    // 2. Award Individual: Most Improved Player (Highest Season Rating Delta)
    const allPlayersInWorld = Object.values(state.players);
    const mip = [...allPlayersInWorld].sort((a, b) => (b.history.seasonRatingDelta || 0) - (a.history.seasonRatingDelta || 0))[0];

    if (mip && (mip.history.seasonRatingDelta || 0) > 0) {
        mip.achievements.push({
            season: state.world.currentSeason || 2050,
            title: `Most Improved Player (+${mip.history.seasonRatingDelta} pts)`,
            type: 'Individual'
        });
    }

    // 3. Cleanup and Reset
    Object.values(state.players).forEach(player => {
        if (player.district === 'EXILADO') return;

        // Apply Fatigue for participants
        const isConvoked = Object.values(state.teams).some(t => t.id.startsWith('d_') && t.squad.includes(player.id));

        if (isConvoked) {
            player.fatigue = 50; // Heavy fatigue for next season

            // Profit Logic: Add rating gain to original club powerCap
            const originalTeamId = player.contract.teamId;
            if (originalTeamId) {
                const club = state.teams[originalTeamId];
                if (club) {
                    const ratingGain = player.history.seasonRatingDelta || 0;
                    if (ratingGain > 0) {
                        club.powerCap! += ratingGain;
                    }
                }
            }
        } else {
            player.fatigue = 0; // Fresh
        }

    });

    state.world.phase = 'OFFSEASON';
};
