import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTeam } from "../endpoints/admin/team_GET.schema";
import { postSetTeamRole, InputType as RoleInput } from "../endpoints/admin/team_role_POST.schema";

// React Query hooks for the admin Team page.
export const useTeam = {
  useMembers: () =>
    useQuery({
      queryKey: ["team"],
      queryFn: () => getTeam(),
      placeholderData: (p) => p,
    }),
  useSetRole: () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (input: RoleInput) => postSetTeamRole(input),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
    });
  },
};