"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import type { FavoriteRecord } from "@/modules/workspace-ui/domain/workspace-types";
import { WorkspaceApiClient } from "@/modules/workspace-ui/infrastructure/workspace-api-client";

export function useFavoritesQuery(workspaceSlug: string) {
  return useQuery({
    queryKey: workspaceQueryKeys.favorites(workspaceSlug),
    queryFn: () => new WorkspaceApiClient(workspaceSlug).listFavorites(),
  });
}

export function useSetFavoriteMutation(workspaceSlug: string) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.favorites(workspaceSlug);

  return useMutation({
    mutationFn: (variables: {
      favorite: boolean;
      target: FavoriteRecord;
    }) => new WorkspaceApiClient(workspaceSlug).setFavorite({
      targetType: variables.target.targetType,
      targetId: variables.target.targetId,
      favorite: variables.favorite,
    }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<FavoriteRecord[]>(queryKey);
      queryClient.setQueryData<FavoriteRecord[]>(queryKey, (current = []) =>
        variables.favorite
          ? [
              ...current.filter((item) => !(
                item.targetType === variables.target.targetType
                && item.targetId === variables.target.targetId
              )),
              variables.target,
            ]
          : current.filter((item) => !(
            item.targetType === variables.target.targetType
            && item.targetId === variables.target.targetId
          )),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
