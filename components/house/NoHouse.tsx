import { useAppVM } from "@context/Contexts";
import { Add, Check } from "@mui/icons-material";
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { observer } from "mobx-react-lite";
import { ElementType, useEffect, useState } from "react";
import { useMediaQuery } from "@mui/material";
import { useRouter } from "next/router";
import AppVM from "@context/appVM";

interface props {
  title?: boolean;
}

const a11yProps = (index: number) => {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const NoHouse = ({ title }: props) => {
  const appVM = useAppVM();
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);
  const [newName, setNewName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [houseCode, setHouseCode] = useState<string>("");
  const [codeInputError, setCodeinputError] = useState<string>("");
  const [inputError, setInputError] = useState<string>("");
  const isSmallScreen = useMediaQuery("(max-width: 600px)");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleTabChange = (_e: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const createHouse = async () => {
    if (validateHouseName(newName)) {
      setCreating(true);
      try {
        const res = await fetch("/api/houses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({ name: newName }),
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) {
          AppVM.showAlert(data.message, "error");
          setCreating(false);
          return;
        }
        appVM.house = data.house;
        router.push("/profile");
      } catch (e: any) {
        AppVM.showAlert(e.message, "error");
      }
      setCreating(false);
    }
  };

  const validateHouseName = (name: string) => {
    if (name.length < 3) {
      setInputError("House name must be at least 3 characters long");
      return false;
    }
    if (name.length > 20) {
      setInputError("House name must be less than 20 characters long");
      return false;
    }
    if (name.match(/[!@#$%^&*]/)) {
      setInputError("House name cannot contain special characters");
      return false;
    }
    setInputError("");
    return true;
  };

  const validateInvitationCode = (code: string) => {
    if (code.length !== 6) {
      setCodeinputError("Invalid invitation code");
      return false;
    }
    //only letters and numbers
    if (code.match(/[^a-zA-Z0-9]/)) {
      setCodeinputError("Invalid invitation code");
      return false;
    }
    setCodeinputError("");
    return true;
  };

  return (
    <Stack
      alignItems='center'
      justifyContent='start'
      paddingBottom={4}
      gap={4}
      paddingTop={isSmallScreen ? 0 : 4}
      height={title ? "100%" : "fit-content"}
    >
      {title && (
        <Typography variant={isSmallScreen ? "h5" : "h4"}>
          {" "}
          You are not part of a house{" "}
        </Typography>
      )}
      {loading ? (
        <Box sx={{ paddingTop: "3rem" }}>
          {" "}
          <CircularProgress />{" "}
        </Box>
      ) : (
        <Stack>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label='basic tabs example'
            sx={{ maxWidth: "350px", width: "100%" }}
          >
            <Tab label='Create a house' {...a11yProps(0)} />
            <Typography margin='auto'>Or</Typography>
            <Tab label='Join a house' {...a11yProps(2)} />
          </Tabs>
          <TabPanel value={tabValue} index={0}>
            <Stack
              direction={isSmallScreen ? "column" : "row"}
              gap={2}
              alignItems={isSmallScreen ? "stretch" : ""}
            >
              <TextField
                error={inputError ? true : false}
                helperText={inputError}
                label='House Name'
                slotProps={{ htmlInput: { maxLength: 20, minLength: 3 } }}
                type='text'
                id='houseName'
                onChange={e => {
                  setNewName(e.target.value);
                }}
                onBlur={() => {
                  if (inputError) validateHouseName(newName);
                }}
              />
              <Button
                variant='contained'
                onClick={() => {
                  createHouse();
                }}
              >
                {creating ? <CircularProgress size={24} /> : <Add />}
              </Button>
            </Stack>
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <Stack
              direction={isSmallScreen ? "column" : "row"}
              gap={2}
              alignItems={isSmallScreen ? "stretch" : ""}
            >
              <TextField
                label='Invitation Code'
                type='text'
                id='houseName'
                helperText={codeInputError}
                error={codeInputError ? true : false}
                slotProps={{ htmlInput: { maxLength: 6, minLength: 6 } }}
                onChange={e => {
                  setHouseCode(e.target.value);
                }}
                onBlur={() => {
                  if (codeInputError) validateInvitationCode(houseCode);
                }}
              />
              <Button
                variant='contained'
                onClick={() => {
                  if (validateInvitationCode(houseCode)) {
                    router.push(`/house/join/${houseCode}`);
                  }
                }}
              >
                {creating ? <CircularProgress size={24} /> : <Check />}
              </Button>
            </Stack>
          </TabPanel>
        </Stack>
      )}
    </Stack>
  );
};

export default observer(NoHouse);
