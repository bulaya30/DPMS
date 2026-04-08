import { useEffect } from "react";
import { socket } from "../api/socket";
import { useQueryClient } from "@tanstack/react-query";

export function useRealtimeUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    socket.on("branchesUpdated", () => queryClient.invalidateQueries({queryKey: ["branches"]}));
    socket.on("typesUpdated", () => queryClient.invalidateQueries({queryKey: ["types"]}));
    socket.on("birdsUpdated", () => queryClient.invalidateQueries({queryKey: ["birds"]}));
    socket.on("eggsUpdated", () => queryClient.invalidateQueries({queryKey: ["eggs"]}));
    socket.on("feedsUpdated", () => queryClient.invalidateQueries({queryKey: ["feeds"]}));
    socket.on("lossesUpdated", () => queryClient.invalidateQueries({queryKey: ["losses"]}));
    
    socket.on("priceRulesUpdated", () => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "prices",
      });
    });

    socket.on("salesUpdated", () => {
      queryClient.invalidateQueries({queryKey: ["sales"]});
      queryClient.invalidateQueries({queryKey: ["dailySales"]});
    });
    socket.on("usersUpdated", () => {
      queryClient.invalidateQueries({queryKey: ["users"]});
      queryClient.invalidateQueries({queryKey: ["employees"]});
    });
    socket.on("vaccinationsUpdated", () => queryClient.invalidateQueries({queryKey: ["vaccinations"]}));
    socket.on("vaccinationSchedulesUpdated", () => queryClient.invalidateQueries({queryKey: ["vaccinationSchedules"]}));

    return () => {
      socket.off("branchesUpdated");
      socket.off("typesUpdated");
      socket.off("birdsUpdated");
      socket.off("eggsUpdated");
      socket.off("feedsUpdated");
      socket.off("lossesUpdated");
      socket.off("priceRulesUpdated");
      socket.off("salesUpdated");
      socket.off("usersUpdated");
      socket.off("vaccinationsUpdated");
      socket.off("vaccinationSchedulesUpdated");
    };
  }, [queryClient]);
}