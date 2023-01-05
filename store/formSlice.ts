import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { HYDRATE } from "next-redux-wrapper";
import {  EncryptedForm, FormParams, FormTheme, Page, Question } from "../common/types";
import { QuestionTypesData, QuestionTypesEnum } from "../common/question";
import { setEditableFormStateFromStorage } from "../common";
import { digestSHA256, loadPublicKeyData } from "../common/security";
import { getEOA, getStoredForm } from "../common/storage";


export type Form = {title?: string, description?: string, logo?: string} & Record<string ,any>


export function getPackedFormFromState(state: FormState, data: {
    pubKey: string,
    eoa: string,
    data: string, 
    hash: string
}) {
    const params = {...state.formParams} as FormParams
    const formJSON = JSON.parse(getStoredForm() as string)
    params.title = formJSON.title;
    params.description = formJSON.description;
    const form: EncryptedForm ={
        header: {
            alg: 'AES-GCM',
            keyEncAlg: 'ECDSA',
            access: (state.formParams.access as any) || "public"
        },
        payload: {
            data: data.data,
            meta: params,
            iss: data.pubKey,
            owner: data.eoa,
            subRecord: state.subRecord,
            inviteList: state.inviteList
        },
        proof: {
            hash: data.hash,
            keyHash: state.keyHash as string,

        }
    };
    return form;


}

export interface FormState {
    tabName: string
    isEditable: boolean;
    openQuestionSelectionDialog: boolean;
    openConfirmationDialog: boolean;
    pages: Page[]
    currentPageIndex: number;
    formTheme?: FormTheme;
    formParams: Partial<FormParams>;
    encKey?: string;
    form: Form;
    subRecord: Record<string, string>;
    inviteList: string[];
    hash?: string;
    encData: string;
    iss?: string;
    owner?: string;
    keyHash?: string;
    rawContentUrl?: string;
}

const initialState: FormState = {
    tabName: 'form',
    isEditable: false,
    openQuestionSelectionDialog: false,
    openConfirmationDialog: true,
    pages: [],
    currentPageIndex: 1,
    formParams: {
        isClosed: false,
        isPayable: false,
        access: 'public',
        rate: 0,
    },
    form: {
        title: 'Untitled'
    },
    subRecord: {},
    inviteList: [],
    encData: ''

}


function parseQuestionIndex(index: string): number[] {
    return index.split('.').map(parseInt);
}


function _removePageAtIndex(pages: Page[], index: number) {
    return pages.filter((page) => page.pageId !== index).map((_page) => {
        if(_page.pageId > index) {
            _page.pageId -= 1;
        }
        return _page
    });
}


export const formSlice = createSlice({
    name: 'form',
    initialState,
    reducers: {
        loadEncForm(state, action: PayloadAction<EncryptedForm>) {
            state.formParams = {...action.payload.payload.meta};
            state.subRecord = action.payload.payload.subRecord;
            state.inviteList = action.payload.payload.inviteList;
            state.hash = action.payload.proof.hash;
            state.keyHash = action.payload.proof.keyHash;
            state.iss = action.payload.payload.iss;
            state.owner = action.payload.payload.owner;
        },
        setFormId(state, action: PayloadAction<string>) {
            state.formParams.formId = action.payload;
        },
        setRawContentUrl(state, action: PayloadAction<string>) {
            state.rawContentUrl = action.payload;
        },
        setEncData(state, action: PayloadAction<string>) {
            state.encData = action.payload;
        },
        setKeyHash(state, action: PayloadAction<string | undefined>){
            state.keyHash = action.payload;
        },

        addRecord(state, action: PayloadAction<[string, string]>){
            state.subRecord[action.payload[0]] = action.payload[1];
        },

        addInInviteList(state, action: PayloadAction<string>){
            state.inviteList.push(action.payload);
        },

        setHash(state, action:PayloadAction<string>) {
            state.hash = digestSHA256(action.payload);
        },

        setTitle(state, action: PayloadAction<string>){
            state.form.title = action.payload;
        },

        setEditableState(state, action: PayloadAction<boolean>){
            state.isEditable = action.payload;

            // Storing the form state
            setEditableFormStateFromStorage(state);
        },
        setIntroDescription(state, action: PayloadAction<string>){
            state.form.description = action.payload;
        },
        setStartDate(state, action: PayloadAction<string>){
            state.formParams.startDate = action.payload;
        },
        setEndDate(state, action: PayloadAction<string>){
            state.formParams.endDate = action.payload;
        },
        setIsClosed(state, action: PayloadAction<boolean>){
            state.formParams.isClosed = action.payload;
        },
        setIsPayable(state, action: PayloadAction<boolean>){
            state.formParams.isClosed = action.payload;
        },
        setRate(state, action: PayloadAction<number>){
            state.formParams.rate = action.payload < 0 ? 0: action.payload;
        },
        setNumberOfResponse(state, action: PayloadAction<number>){
            state.formParams.maxNumberOfResponse = action.payload < 0 ? 0: action.payload;
        },
        setFormInitialState(state, action: PayloadAction<FormState>) {
            state = Object.assign({}, initialState, action.payload);
        },
        // setTitle(state, action: PayloadAction<string>) {
        //     state.formIntro.title = action.payload;
        //     // Storing the form state
        //     setEditableFormStateFromStorage(state);
        // },
        setTabIndex(state, action: PayloadAction<string>) {
            state.tabName = action.payload;
            // Storing the form state
            // setEditableFormStateFromStorage(state);
        },
        setAccess(state, action: PayloadAction<string>) {
            state.formParams.access = action.payload;
        },
        setOpenQuestionSelectDialogState(state, action: PayloadAction<boolean>) {
            state.openQuestionSelectionDialog = action.payload;
            // Storing the form state
            setEditableFormStateFromStorage(state);
        },
        setOpenConfirmationDialogState(state, action: PayloadAction<boolean>) {
            state.openConfirmationDialog = action.payload;
            // Storing the form state
            setEditableFormStateFromStorage(state);
        },
        addQuestion(state, action: PayloadAction<{question: Question, index?: string}>) {
            let page: Page = {
                pageId: state.pages.length + 1,
                questions: [],
                params: {}
            }
            if (action.payload.index !== undefined) {
                page = formGetters(state).getPage(action.payload.index);
            }
            const ques = action.payload.question;
            ques.qid = page.pageId.toString();
            ques.index = page.questions.length;
            if (page.questions.length == 1) {
                page.questions[0].qid = `${page.pageId}.1`
            }
            if (page.questions.length > 0) {
                ques.qid = `${page.pageId}.${page.questions.length + 1}`;
            }
            page.questions.push(ques);
            state.pages[page.pageId - 1] = page;
            state.currentPageIndex = page.pageId;
            // Storing the form state
            setEditableFormStateFromStorage(state);

        },
        removeQuestionAtIndex(state, action: PayloadAction<string>) {
            // The method to be overlooked
            // This method is created to accompany future implementation
            // Which can support multiple question in single page
            const getter = formGetters(state);
            const page = getter.getPage(action.payload);
            const quesIndex = getter.getQuestionIndex(action.payload);
            page.questions = page.questions.filter((ques, index) => index !== quesIndex);
            state.pages[page.pageId - 1] = page;

            // Filter out the page and update the pageId of pages below
            if (page.questions.length == 0) {
                state.pages = _removePageAtIndex(state.pages, page.pageId);
            }
            // Storing the form state
            setEditableFormStateFromStorage(state);
        },
        removePageAtIndex(state, action: PayloadAction<number>){
            state.pages = _removePageAtIndex(state.pages, action.payload);
            // Storing the form state
            setEditableFormStateFromStorage(state);
        },
        updateQuestionAtIndex(state, action: PayloadAction<{question: Question, index: string}>) {
            const getter = formGetters(state);
            const page = getter.getPage(action.payload.index);

            page.questions[action.payload.question.index as number] = action.payload.question;
            state.pages[page.pageId - 1] = page;
            // Storing the form state
            setEditableFormStateFromStorage(state);
        },
        swapPages(state, action: PayloadAction<[number, number]>) {
            const getter = formGetters(state);
            const p1 = getter.getPage(action.payload[0].toString());
            const p2 = getter.getPage(action.payload[1].toString());
            p2.pageId = action.payload[0];
            p1.pageId = action.payload[1];   
            state.pages[action.payload[0] - 1] = p2;
            state.pages[action.payload[1] - 1] = p1;
            // Storing the form state
            setEditableFormStateFromStorage(state);
        },
        setCurrentPageIndex(state, action: PayloadAction<number>){
            state.currentPageIndex = action.payload;
            // Storing the form state
            setEditableFormStateFromStorage(state);
        }

    },
    extraReducers: {
        [HYDRATE]: (state, action) => {
            return {
                ...state,
                ...action.payload.form
            }
        }
    }
});


export const formActions = formSlice.actions;


export const formGetters = (state: FormState) => ({
    getQuestionIndex(index: string) {
        const indexes = parseQuestionIndex(index);
        if (indexes.length === 2) return indexes[1] - 1;
        return 0;
    },
    getPage(index: string) {
        const numberIndexes = parseQuestionIndex(index);
        return state.pages[numberIndexes[0] - 1];
    },
    getQuestionAtIndex(index: string) {
        const numberIndexes = parseQuestionIndex(index);
        const page = this.getPage(index);
        return page.questions[this.getQuestionIndex(index)];
    },
    getPageBarTitle(index: string) {
        const question = this.getQuestionAtIndex(index);
        return question.title;
    },
    getPageCount() {
        return state.pages.length;
    },
    getPageQuestionTypeData(index: number) {
        const page = this.getPage(index.toString())
        const question = page.questions[0];
        return QuestionTypesData[question.type as QuestionTypesEnum];
    },
    getCurrentPageIndex() {
        return state.currentPageIndex;
    },
    getFormattedForm(data: string, hash: string) {
        const pubKey = loadPublicKeyData().pubKey;
        const eoa = getEOA() as string;
        return getPackedFormFromState(state, {
            pubKey,
            eoa,
            data,
            hash
        });
    }
    
});

export default formSlice.reducer;