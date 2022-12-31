import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { AppState } from "./index";
import { HYDRATE } from "next-redux-wrapper";

export interface CreateFormState {
    title: string
    tabName: string
    access: string
    openQuestionSelectionDialog: boolean
}

const initialState: CreateFormState = {
    title: 'Untitled',
    tabName: 'create',
    access: 'private',
    openQuestionSelectionDialog: false
}

export const createFormSlice = createSlice({
    name: 'createForm',
    initialState,
    reducers: {
        reset(state, action){
            state = initialState;
        },
        setTitle(state, action: PayloadAction<string>) {
            state.title = action.payload;
        },
        setTabIndex(state, action: PayloadAction<string>) {
            state.tabName = action.payload;
        },
        setAccess(state, action: PayloadAction<string>) {
            state.access = action.payload;
        },
        setOpenQuestionSelectDialogState(state, action: PayloadAction<boolean>) {
            state.openQuestionSelectionDialog = action.payload;
        }
    },
    extraReducers: {
        [HYDRATE]: (state, action) => {
            return {
                ...state,
                ...action.payload.createForm
            }
        }
    }
});


export const createFormActions = createFormSlice.actions;

export default createFormSlice.reducer;