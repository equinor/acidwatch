import React from "react"
import { create } from "zustand";
import { getAccessToken } from "../services/auth";
import config from "../configuration";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { Typography } from "@equinor/eds-core-react";

interface Setting {
  type: "int" | "float" | "bool"
  name: string
  label: string
  default: number
  description?: string
  min?: number
  max?: number
  unit?: string
}

interface ModelInfo {
  model_id: string
  model_name: string
  concs: Record<string, number | null>
  settings: Setting[]
}

// interface States {
//   modelsHaveLoaded: boolean,
//   models: ModelInfo[],
//   triedLoadOnce: boolean,
// }

// interface Actions {
//   loadOnce: () => Promise<void>,
// }

// const useModels = create<States & Actions>((set, get) => ({
//   modelsHaveLoaded: false,
//   triedLoadOnce: false,
//   models: [],

//   loadOnce: async () => {
//     const { triedLoadOnce } = get();
//     if (triedLoadOnce)
//       return;

//     set({ triedLoadOnce: true });

//     const token = await getAccessToken();
//     const response = await fetch(config.API_URL + "/models", {
//       method: "GET",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${token}`,

//       }
//     });

//     set({ models: await response.json() });
//   },
// }));

// u

const useModels: () => UseQueryResult<ModelInfo[]> = () => {
  return useQuery({
    queryKey: ["model"],
    queryFn: async () => {
      const token = await getAccessToken();
      const response = await fetch(config.API_URL + "/models", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      return await response.json();
    },
    retry: false,
  });
}

const ModelSettings: React.FC<{ model: ModelInfo }> = ({ model }) => {
  return (
    <>
      <Typography variant="h2">{ model.model_name }</Typography>
    </>
  )
}

const ModelsPage: React.FC = () => {
  // useModels(async (state) => await state.loadOnce());
  const { data, isLoading, error } = useModels();

  if (isLoading) {
    return <>Loading models</>;
  } else if (error !== null) {
    console.error(error);
    return <>Error!</>;
  } else if (data === undefined) {
    console.log("Data is undefined");
    return <>Error!</>;
  }

  return (
    <>
      <Typography variant="h1">Models:</Typography>
      {data.map((model) => <ModelSettings key={model.model_id} model={model} />)}
    </>
  );
}

export default ModelsPage;
