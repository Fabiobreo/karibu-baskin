"use client";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import BadgeIcon from "@mui/icons-material/Badge";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useTranslations } from "next-intl";
import type { Gender } from "@prisma/client";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { useEntityLabels } from "@/hooks/useEntityLabels";
import { useAddChildFlow } from "@/hooks/useAddChildFlow";
import ParentalConsentBox from "@/components/profile/ParentalConsentBox";
import {
  formatBirthDate,
  type AddStep,
  type ChildData,
} from "@/components/profile/childLinkerShared";

interface ChildAddDialogProps {
  onClose: () => void;
  onChildAdded: (child: ChildData) => void;
}

/**
 * Dialog multi-step "Aggiungi figlio": ricerca per email/nome con richiesta di
 * collegamento, oppure creazione manuale. Montare solo quando aperto (stato fresco).
 */
export default function ChildAddDialog({ onClose, onChildAdded }: ChildAddDialogProps) {
  const t = useTranslations("childLinker");
  const tCommon = useTranslations("common");
  const dateLocale = useActiveDateLocale();
  const { genderLabel } = useEntityLabels();
  const flow = useAddChildFlow({ onChildAdded, onClose });
  const {
    addStep,
    setAddStep,
    emailInput,
    setEmailInput,
    emailError,
    setEmailError,
    nameInput,
    setNameInput,
    nameResults,
    setNameResults,
    nameSearched,
    setNameSearched,
    foundUser,
    setFoundUser,
    confirmName,
    setConfirmName,
    searching,
    createForm,
    setCreateForm,
    creating,
    parentalConsent,
    setParentalConsent,
    handleSearchEmail,
    handleSearchName,
    handleConfirmYes,
    handleCreateManually,
  } = flow;

  const ADD_TITLES: Record<AddStep, string> = {
    choice: t("titleChoice"),
    email: t("titleEmail"),
    name: t("titleName"),
    confirm: t("titleConfirm"),
    sent: t("titleSent"),
    create: t("titleCreate"),
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{ADD_TITLES[addStep]}</DialogTitle>

      <DialogContent>
        {/* Step: scelta metodo */}
        {addStep === "choice" && (
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t("choiceIntro")}
            </Typography>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              startIcon={<EmailIcon />}
              onClick={() => {
                setEmailInput("");
                setEmailError(null);
                setAddStep("email");
              }}
              sx={{ justifyContent: "flex-start", py: 1.5 }}
            >
              <Box sx={{ textAlign: "left" }}>
                <Typography variant="body2" fontWeight={600}>
                  {t("searchByEmail")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("searchByEmailDesc")}
                </Typography>
              </Box>
            </Button>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              startIcon={<BadgeIcon />}
              onClick={() => {
                setNameInput("");
                setNameResults([]);
                setNameSearched(false);
                setAddStep("name");
              }}
              sx={{ justifyContent: "flex-start", py: 1.5 }}
            >
              <Box sx={{ textAlign: "left" }}>
                <Typography variant="body2" fontWeight={600}>
                  {t("searchByName")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("searchByNameDesc")}
                </Typography>
              </Box>
            </Button>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => {
                setCreateForm({ name: "", gender: "", birthDate: "" });
                setAddStep("create");
              }}
              sx={{ justifyContent: "flex-start", py: 1.5 }}
            >
              <Box sx={{ textAlign: "left" }}>
                <Typography variant="body2" fontWeight={600}>
                  {t("createManually")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("createManuallyDesc")}
                </Typography>
              </Box>
            </Button>
          </Stack>
        )}

        {/* Step: ricerca email */}
        {addStep === "email" && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t("emailStepDesc")}
            </Typography>
            <TextField
              label={t("email")}
              type="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setEmailError(null);
              }}
              fullWidth
              size="small"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSearchEmail()}
              error={!!emailError}
            />
            {emailError && (
              <Alert severity="warning" sx={{ py: 0.5 }}>
                {emailError}
              </Alert>
            )}
          </Stack>
        )}

        {/* Step: ricerca per nome */}
        {addStep === "name" && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t("nameStepDesc")}
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                label={t("fullName")}
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  setNameSearched(false);
                }}
                fullWidth
                size="small"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSearchName()}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleSearchName}
                disabled={searching || !nameInput.trim()}
                sx={{ flexShrink: 0, minWidth: 44, px: 1 }}
              >
                {searching ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
              </Button>
            </Box>
            {nameSearched && nameResults.length > 0 && (
              <List
                disablePadding
                sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}
              >
                {nameResults.map((u, idx) => (
                  <ListItem key={u.id} disablePadding divider={idx < nameResults.length - 1}>
                    <ListItemButton
                      onClick={() => {
                        setFoundUser(u);
                        setConfirmName(u.name ?? "");
                        setAddStep("confirm");
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          src={u.image ?? undefined}
                          sx={{ width: 36, height: 36, fontSize: 15 }}
                        >
                          {(u.name ?? "?")[0].toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={u.name ?? "—"}
                        secondary={[
                          u.gender ? genderLabel(u.gender as Gender) : null,
                          u.birthDate ? formatBirthDate(u.birthDate, dateLocale) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
            {nameSearched && nameResults.length === 0 && (
              <>
                <Alert severity="info" sx={{ py: 0.5 }}>
                  {t("noResults")}
                </Alert>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PersonAddIcon />}
                  onClick={() => {
                    setCreateForm({ name: nameInput, gender: "", birthDate: "" });
                    setAddStep("create");
                  }}
                >
                  {t("createManually")}
                </Button>
              </>
            )}
          </Stack>
        )}

        {/* Step: conferma utente trovato */}
        {addStep === "confirm" && foundUser && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {t("areYouParent")}
            </Typography>
            <Paper variant="outlined" sx={{ p: 2.5 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  mb: foundUser.gender || foundUser.birthDate ? 1.5 : 0,
                }}
              >
                <Avatar
                  src={foundUser.image ?? undefined}
                  sx={{ width: 48, height: 48, flexShrink: 0, fontSize: 20 }}
                >
                  {(confirmName || "?")[0].toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {foundUser.gender && (
                    <Typography variant="caption" color="text.secondary">
                      {genderLabel(foundUser.gender as Gender)}
                    </Typography>
                  )}
                  {foundUser.birthDate && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t("bornOn", { date: formatBirthDate(foundUser.birthDate, dateLocale) })}
                    </Typography>
                  )}
                </Box>
              </Box>
              <TextField
                label={t("nameInProfile")}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                fullWidth
                size="small"
                inputProps={{ maxLength: 60 }}
                helperText={!foundUser.name ? t("noNameHint") : undefined}
                error={!foundUser.name && !confirmName.trim()}
              />
            </Paper>
            <ParentalConsentBox checked={parentalConsent} onChange={setParentalConsent} />
          </Stack>
        )}

        {/* Step: richiesta inviata */}
        {addStep === "sent" && (
          <Stack spacing={2} sx={{ mt: 1, alignItems: "center", textAlign: "center", py: 1 }}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 56 }} />
            <Typography variant="body1" fontWeight={700}>
              {t("requestSent")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("requestSentDesc", { name: confirmName || foundUser?.name || "" })}
            </Typography>
          </Stack>
        )}

        {/* Step: crea manualmente */}
        {addStep === "create" && (
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label={t("fullNameReq")}
              value={createForm.name}
              onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
              fullWidth
              size="small"
              autoFocus
              inputProps={{ maxLength: 60 }}
            />
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                display="block"
                gutterBottom
              >
                {t("gender")}
              </Typography>
              <Select
                fullWidth
                size="small"
                displayEmpty
                value={createForm.gender}
                onChange={(e) => setCreateForm((s) => ({ ...s, gender: e.target.value }))}
              >
                <MenuItem value="">
                  <em>{t("notSpecified")}</em>
                </MenuItem>
                <MenuItem value="MALE">{t("male")}</MenuItem>
                <MenuItem value="FEMALE">{t("female")}</MenuItem>
              </Select>
            </Box>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                display="block"
                gutterBottom
              >
                {t("birthDate")}
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="date"
                value={createForm.birthDate}
                onChange={(e) => setCreateForm((s) => ({ ...s, birthDate: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {t("roleAssignedByCoach")}
            </Typography>
            <ParentalConsentBox checked={parentalConsent} onChange={setParentalConsent} />
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {addStep === "choice" && <Button onClick={onClose}>{tCommon("cancel")}</Button>}
        {addStep === "email" && (
          <>
            <Button onClick={() => setAddStep("choice")}>{t("back")}</Button>
            <Button
              variant="contained"
              onClick={handleSearchEmail}
              disabled={searching || !emailInput.trim()}
              startIcon={
                searching ? <CircularProgress size={14} color="inherit" /> : <SearchIcon />
              }
            >
              {searching ? tCommon("searching") : tCommon("search")}
            </Button>
          </>
        )}
        {addStep === "name" && <Button onClick={() => setAddStep("choice")}>{t("back")}</Button>}
        {addStep === "confirm" && (
          <>
            <Button onClick={() => setAddStep("choice")} disabled={creating}>
              {t("noRetry")}
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmYes}
              disabled={creating || !confirmName.trim() || !parentalConsent}
              startIcon={creating ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              {creating ? t("sendingRequest") : t("yesMyChild")}
            </Button>
          </>
        )}
        {addStep === "sent" && (
          <Button variant="contained" onClick={onClose}>
            {tCommon("close")}
          </Button>
        )}
        {addStep === "create" && (
          <>
            <Button onClick={() => setAddStep("choice")}>{t("back")}</Button>
            <Button
              variant="contained"
              onClick={handleCreateManually}
              disabled={creating || !createForm.name.trim() || !parentalConsent}
            >
              {creating ? tCommon("saving") : tCommon("add")}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
