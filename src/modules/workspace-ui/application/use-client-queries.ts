"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { workspaceQueryKeys } from "@/modules/workspace-ui/application/query-keys";
import type {
  ClientMemberRecord,
  ClientRecord,
  ClientResourceRecord,
  MemberRecord,
} from "@/modules/workspace-ui/domain/workspace-types";
import { WorkspaceApiClient } from "@/modules/workspace-ui/infrastructure/workspace-api-client";

export function useUpdateClientMutation(workspaceSlug: string, clientId: string) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.clients(workspaceSlug);
  return useMutation({
    mutationFn: (variables: { request: Record<string, unknown>; optimistic: Partial<ClientRecord> }) =>
      new WorkspaceApiClient(workspaceSlug).updateClient(clientId, variables.request),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ClientRecord[]>(queryKey);
      queryClient.setQueryData<ClientRecord[]>(queryKey, (current = []) =>
        current.map((client) => client.id === clientId
          ? { ...client, ...variables.optimistic }
          : client),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.favorites(workspaceSlug) }),
      ]);
    },
  });
}

export function useClientResourcesQuery(workspaceSlug: string, clientId: string) {
  return useQuery({
    queryKey: workspaceQueryKeys.clientResources(workspaceSlug, clientId),
    queryFn: () => new WorkspaceApiClient(workspaceSlug).listClientResources(clientId),
  });
}

export function useCreateClientResourceMutation(workspaceSlug: string, clientId: string) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.clientResources(workspaceSlug, clientId);
  return useMutation({
    mutationFn: (input: { title: string; url: string; description: string | null; iconKey: string | null }) =>
      new WorkspaceApiClient(workspaceSlug).createClientResource(clientId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ClientResourceRecord[]>(queryKey);
      const now = new Date().toISOString();
      queryClient.setQueryData<ClientResourceRecord[]>(queryKey, (current = []) => [
        ...current,
        {
          id: `optimistic-${crypto.randomUUID()}`,
          clientId,
          ...input,
          position: current.length,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteClientResourceMutation(workspaceSlug: string, clientId: string) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.clientResources(workspaceSlug, clientId);
  return useMutation({
    mutationFn: (resourceId: string) =>
      new WorkspaceApiClient(workspaceSlug).deleteClientResource(clientId, resourceId),
    onMutate: async (resourceId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ClientResourceRecord[]>(queryKey);
      queryClient.setQueryData<ClientResourceRecord[]>(queryKey, (current = []) =>
        current.filter((resource) => resource.id !== resourceId),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useClientMembersQuery(workspaceSlug: string, clientId: string) {
  return useQuery({
    queryKey: workspaceQueryKeys.clientMembers(workspaceSlug, clientId),
    queryFn: () => new WorkspaceApiClient(workspaceSlug).listClientMembers(clientId),
  });
}

export function useAddClientMemberMutation(workspaceSlug: string, clientId: string) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.clientMembers(workspaceSlug, clientId);
  return useMutation({
    mutationFn: (variables: {
      member: MemberRecord;
      permission: ClientMemberRecord["permission"];
    }) => new WorkspaceApiClient(workspaceSlug).addClientMember(clientId, {
      membershipId: variables.member.membershipId,
      permission: variables.permission,
    }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ClientMemberRecord[]>(queryKey);
      queryClient.setQueryData<ClientMemberRecord[]>(queryKey, (current = []) => [
        ...current.filter((member) => member.membershipId !== variables.member.membershipId),
        {
          ...variables.member,
          role: variables.member.role ?? "member",
          permission: variables.permission,
        },
      ]);
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useRemoveClientMemberMutation(workspaceSlug: string, clientId: string) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.clientMembers(workspaceSlug, clientId);
  return useMutation({
    mutationFn: (membershipId: string) =>
      new WorkspaceApiClient(workspaceSlug).removeClientMember(clientId, membershipId),
    onMutate: async (membershipId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ClientMemberRecord[]>(queryKey);
      queryClient.setQueryData<ClientMemberRecord[]>(queryKey, (current = []) =>
        current.filter((member) => member.membershipId !== membershipId),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useUpdateClientMemberMutation(workspaceSlug: string, clientId: string) {
  const queryClient = useQueryClient();
  const queryKey = workspaceQueryKeys.clientMembers(workspaceSlug, clientId);
  return useMutation({
    mutationFn: (variables: {
      membershipId: string;
      permission: ClientMemberRecord["permission"];
    }) => new WorkspaceApiClient(workspaceSlug).updateClientMember(
      clientId,
      variables.membershipId,
      variables.permission,
    ),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ClientMemberRecord[]>(queryKey);
      queryClient.setQueryData<ClientMemberRecord[]>(queryKey, (current = []) =>
        current.map((member) => member.membershipId === variables.membershipId
          ? { ...member, permission: variables.permission }
          : member),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
