import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { api, createSSRClient, type SvelteKitAxiosConfig } from "$lib/axiosClient";
import type { ProfileResponse, UserGamesResponse } from "@chess-fw/contracts";
import { authClient } from "$lib/client";

export const load: PageServerLoad = async ({parent, url, request}) => {
    const {session} = await parent();
    
    if (!session) throw redirect(302, '/');

    const limit = url.searchParams.get('limit') ?? "20";
    const offset = url.searchParams.get('offset') ?? "0";

    const client = createSSRClient(request);
    
    const res = await client.get<UserGamesResponse>(`/api/games/user/${session.user?.id}`, {
        params: {
            limit,
            offset
        }
    });

    const res2 = await client.get<ProfileResponse>(`/api/profile/me`);

    const linkedAccounts = await authClient.listAccounts({
        fetchOptions: {
            headers: {
                Cookie: request.headers.get('Cookie')
            }
        }
    })

    return {
        gamesResponse: res.data,
        profileResponse: res2.data,
        linkedAccounts
    };
}