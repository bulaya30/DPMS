import { useEffect } from "react";
import { socket } from "../api/socket";
import { useQueryClient } from "@tanstack/react-query";

export function useRealtimeUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    socket.on("branchesUpdated", () => queryClient.invalidateQueries(["branches"]));
    socket.on("typesUpdated", () => queryClient.invalidateQueries(["types"]));
    socket.on("birdsUpdated", () => queryClient.invalidateQueries(["birds"]));
    socket.on("eggsUpdated", () => queryClient.invalidateQueries(["eggs"]));
    socket.on("feedsUpdated", () => queryClient.invalidateQueries(["feeds"]));
    socket.on("lossesUpdated", () => queryClient.invalidateQueries(["losses"]));
    socket.on("priceRulesUpdated", () => queryClient.invalidateQueries(["prices"]));
    socket.on("salesUpdated", () => {
      queryClient.invalidateQueries(["sales"]);
      queryClient.invalidateQueries(["dailySales"]);
    });
    socket.on("usersUpdated", () => {
      queryClient.invalidateQueries(["users"]);
      queryClient.invalidateQueries(["employees"]);
    });
    socket.on("vaccinationsUpdated", () => queryClient.invalidateQueries(["vaccinations"]));
    socket.on("vaccinationSchedulesUpdated", () => queryClient.invalidateQueries(["vaccinationSchedules"]));

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