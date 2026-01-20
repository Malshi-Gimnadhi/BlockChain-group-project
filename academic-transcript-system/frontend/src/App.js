import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import AcademicTranscriptABI from './contracts/AcademicTranscript.json';

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function App() {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [institutionForm, setInstitutionForm] = useState({
    name: '',
    registrationNumber: '',
    address: ''
  });

  const [transcriptForm, setTranscriptForm] = useState({
    studentAddress: '',
    studentId: '',
    studentName: '',
    program: '',
    courses: [{
      courseCode: '',
      courseName:  '',
      credits: '',
      grade: '',
      year: '',
      semester: ''
    }],
    ipfsHash: ''
  });

  const [searchTranscriptId, setSearchTranscriptId] = useState('');
  const [transcriptData, setTranscriptData] = useState(null);
  const [studentTranscripts, setStudentTranscripts] = useState([]);

  const checkIfWalletIsConnected = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        alert("Please install MetaMask!");
        return;
      }

      const accounts = await ethereum.request({ method: 'eth_accounts' });
      
      if (accounts.length !== 0) {
        const account = accounts[0];
        setCurrentAccount(account);
        setupContract(account);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connectWallet = async () => {
    try {
      const { ethereum } = window;
      if (! ethereum) {
        alert("Get MetaMask!");
        return;
      }

      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      setCurrentAccount(accounts[0]);
      setupContract(accounts[0]);
    } catch (error) {
      console.error(error);
    }
  };

  const setupContract = async (account) => {
    try {
      const { ethereum } = window;
      const provider = new ethers.providers. Web3Provider(ethereum);
      const signer = provider.getSigner();
      const academicContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        AcademicTranscriptABI. abi,
        signer
      );
      
      console.log("✅ Contract initialized:", CONTRACT_ADDRESS);
      console.log("✅ Connected account:", account);
      
      setContract(academicContract);
      await checkUserRole(academicContract, account);
    } catch (error) {
      console.error("❌ Error setting up contract:", error);
    }
  };

  const checkUserRole = async (contractInstance, account) => {
    try {
      console.log("🔍 Checking role for account:", account);
      
      const ADMIN_ROLE = await contractInstance.ADMIN_ROLE();
      const INSTITUTION_ROLE = await contractInstance.INSTITUTION_ROLE();
      
      console.log("📋 ADMIN_ROLE:", ADMIN_ROLE);
      console.log("📋 INSTITUTION_ROLE:", INSTITUTION_ROLE);
      
      const isAdmin = await contractInstance.hasRole(ADMIN_ROLE, account);
      const isInstitution = await contractInstance.hasRole(INSTITUTION_ROLE, account);
      
      console.log("✅ Is Admin?", isAdmin);
      console.log("✅ Is Institution?", isInstitution);
      
      if (isAdmin) {
        console.log("🎯 Setting role to ADMIN");
        setUserRole('ADMIN');
      } else if (isInstitution) {
        console.log("🎯 Setting role to INSTITUTION");
        setUserRole('INSTITUTION');
      } else {
        console.log("🎯 Setting role to STUDENT");
        setUserRole('STUDENT');
      }
    } catch (error) {
      console.error("❌ Error checking role:", error);
      console.error("Error details:", error.message);
      setUserRole('STUDENT');
    }
  };

  const registerInstitution = async (e) => {
    e.preventDefault();
    if (!contract) return;

    try {
      setLoading(true);
      const tx = await contract.registerInstitution(
        institutionForm.name,
        institutionForm.registrationNumber,
        institutionForm.address
      );
      
      await tx.wait();
      alert("Institution registered successfully!");
      setInstitutionForm({ name:  '', registrationNumber: '', address:  '' });
    } catch (error) {
      console.error("Error registering institution:", error);
      alert("Error:  " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const issueTranscript = async (e) => {
    e.preventDefault();
    if (!contract) return;

    try {
      setLoading(true);
      
      const formattedCourses = transcriptForm.courses.map(course => ({
        courseCode: course.courseCode,
        courseName: course.courseName,
        credits: parseInt(course.credits),
        grade: course.grade,
        year: parseInt(course.year),
        semester: parseInt(course.semester)
      }));

      const tx = await contract.issueTranscript(
        transcriptForm.studentAddress,
        transcriptForm.studentId,
        transcriptForm.studentName,
        transcriptForm.program,
        formattedCourses,
        transcriptForm.ipfsHash
      );
      
      await tx.wait();
      alert("Transcript issued successfully!");
      
      setTranscriptForm({
        studentAddress: '',
        studentId: '',
        studentName:  '',
        program: '',
        courses: [{
          courseCode:  '',
          courseName: '',
          credits: '',
          grade:  '',
          year: '',
          semester: ''
        }],
        ipfsHash: ''
      });
    } catch (error) {
      console.error("Error issuing transcript:", error);
      alert("Error: " + error. message);
    } finally {
      setLoading(false);
    }
  };

  const addCourse = () => {
    setTranscriptForm({
      ... transcriptForm,
      courses:  [...transcriptForm.courses, {
        courseCode: '',
        courseName: '',
        credits:  '',
        grade: '',
        year: '',
        semester: ''
      }]
    });
  };

  const removeCourse = (index) => {
    const newCourses = transcriptForm.courses.filter((_, i) => i !== index);
    setTranscriptForm({ ...transcriptForm, courses: newCourses });
  };

  const updateCourse = (index, field, value) => {
    const newCourses = [... transcriptForm.courses];
    newCourses[index][field] = value;
    setTranscriptForm({ ...transcriptForm, courses: newCourses });
  };

  const searchTranscript = async () => {
    if (!contract || !searchTranscriptId) return;

    try {
      setLoading(true);
      const transcript = await contract.getTranscript(searchTranscriptId);
      const courses = await contract.getTranscriptCourses(searchTranscriptId);
      const institution = await contract.getInstitution(transcript.institutionId);
      
      setTranscriptData({
        id: transcript.id. toString(),
        institutionName: institution.name,
        studentAddress: transcript.studentAddress,
        studentId: transcript.studentId,
        studentName: transcript.studentName,
        program: transcript. program,
        issuedAt: new Date(transcript.issuedAt.toNumber() * 1000).toLocaleDateString(),
        isRevoked: transcript.isRevoked,
        ipfsHash: transcript.ipfsHash,
        courses: courses.map(c => ({
          courseCode: c.courseCode,
          courseName: c.courseName,
          credits: c.credits,
          grade: c.grade,
          year: c.year. toString(),
          semester: c. semester. toString()
        }))
      });
    } catch (error) {
      console.error("Error searching transcript:", error);
      alert("Transcript not found or error occurred");
      setTranscriptData(null);
    } finally {
      setLoading(false);
    }
  };

  const getMyTranscripts = async () => {
    if (!contract || !currentAccount) return;

    try {
      setLoading(true);
      const transcriptIds = await contract.getStudentTranscripts(currentAccount);
      
      const transcripts = await Promise.all(
        transcriptIds.map(async (id) => {
          const transcript = await contract.getTranscript(id);
          const courses = await contract.getTranscriptCourses(id);
          const institution = await contract.getInstitution(transcript.institutionId);
          
          return {
            id: id.toString(),
            institutionName: institution.name,
            studentName: transcript.studentName,
            program: transcript.program,
            issuedAt: new Date(transcript.issuedAt.toNumber() * 1000).toLocaleDateString(),
            isRevoked: transcript.isRevoked,
            coursesCount: courses.length
          };
        })
      );
      
      setStudentTranscripts(transcripts);
    } catch (error) {
      console.error("Error getting transcripts:", error);
      alert("Error retrieving transcripts");
    } finally {
      setLoading(false);
    }
  };

  const verifyTranscript = async (transcriptId) => {
    if (!contract) return;

    try {
      setLoading(true);
      const tx = await contract.verifyTranscript(transcriptId);
      await tx.wait();
      alert("✅ Transcript is valid and verified!");
    } catch (error) {
      console.error("Error verifying transcript:", error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎓 Academic Transcript Management System</h1>
        <p>Blockchain-Based Secure Credential Verification</p>
        
        {! currentAccount ? (
          <button onClick={connectWallet} className="connect-button">
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-info">
            <p>Connected:  {currentAccount. substring(0, 6)}...{currentAccount.substring(38)}</p>
            <p>Role: <span className="role-badge">{userRole}</span></p>
          </div>
        )}
      </header>

      <main className="App-main">
        {currentAccount && (
          <>
            {userRole === 'ADMIN' && (
              <section className="section">
                <h2>Register Institution</h2>
                <form onSubmit={registerInstitution} className="form">
                  <input
                    type="text"
                    placeholder="Institution Name"
                    value={institutionForm. name}
                    onChange={(e) => setInstitutionForm({...institutionForm, name: e.target.value})}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Registration Number"
                    value={institutionForm.registrationNumber}
                    onChange={(e) => setInstitutionForm({... institutionForm, registrationNumber:  e.target.value})}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Institution Address (0x...)"
                    value={institutionForm.address}
                    onChange={(e) => setInstitutionForm({...institutionForm, address: e.target. value})}
                    required
                  />
                  <button type="submit" disabled={loading}>
                    {loading ? 'Processing...' : 'Register Institution'}
                  </button>
                </form>
              </section>
            )}

            {userRole === 'INSTITUTION' && (
              <section className="section">
                <h2>Issue Transcript</h2>
                <form onSubmit={issueTranscript} className="form">
                  <input
                    type="text"
                    placeholder="Student Address (0x...)"
                    value={transcriptForm.studentAddress}
                    onChange={(e) => setTranscriptForm({...transcriptForm, studentAddress: e. target.value})}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Student ID"
                    value={transcriptForm.studentId}
                    onChange={(e) => setTranscriptForm({...transcriptForm, studentId: e.target.value})}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Student Name"
                    value={transcriptForm.studentName}
                    onChange={(e) => setTranscriptForm({...transcriptForm, studentName: e.target.value})}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Program (e.g., Computer Science)"
                    value={transcriptForm. program}
                    onChange={(e) => setTranscriptForm({...transcriptForm, program: e.target.value})}
                    required
                  />
                  
                  <h3>Courses</h3>
                  {transcriptForm. courses.map((course, index) => (
                    <div key={index} className="course-form">
                      <input
                        type="text"
                        placeholder="Course Code"
                        value={course.courseCode}
                        onChange={(e) => updateCourse(index, 'courseCode', e.target. value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Course Name"
                        value={course.courseName}
                        onChange={(e) => updateCourse(index, 'courseName', e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Credits"
                        value={course.credits}
                        onChange={(e) => updateCourse(index, 'credits', e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Grade"
                        value={course.grade}
                        onChange={(e) => updateCourse(index, 'grade', e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Year"
                        value={course.year}
                        onChange={(e) => updateCourse(index, 'year', e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Semester"
                        value={course. semester}
                        onChange={(e) => updateCourse(index, 'semester', e.target. value)}
                        required
                      />
                      {transcriptForm.courses.length > 1 && (
                        <button type="button" onClick={() => removeCourse(index)} className="remove-btn">
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button type="button" onClick={addCourse} className="add-course-btn">
                    + Add Course
                  </button>
                  
                  <input
                    type="text"
                    placeholder="IPFS Hash (optional)"
                    value={transcriptForm.ipfsHash}
                    onChange={(e) => setTranscriptForm({...transcriptForm, ipfsHash: e.target.value})}
                  />
                  
                  <button type="submit" disabled={loading}>
                    {loading ? 'Processing...' : 'Issue Transcript'}
                  </button>
                </form>
              </section>
            )}

            <section className="section">
              <h2>Search & Verify Transcript</h2>
              <div className="search-form">
                <input
                  type="number"
                  placeholder="Enter Transcript ID"
                  value={searchTranscriptId}
                  onChange={(e) => setSearchTranscriptId(e.target.value)}
                />
                <button onClick={searchTranscript} disabled={loading}>
                  Search
                </button>
              </div>

              {transcriptData && (
                <div className="transcript-display">
                  <h3>Transcript Details</h3>
                  <div className={`transcript-card ${transcriptData.isRevoked ? 'revoked' : ''}`}>
                    <p><strong>ID:</strong> {transcriptData. id}</p>
                    <p><strong>Institution:</strong> {transcriptData.institutionName}</p>
                    <p><strong>Student:</strong> {transcriptData.studentName}</p>
                    <p><strong>Student ID:</strong> {transcriptData.studentId}</p>
                    <p><strong>Program: </strong> {transcriptData.program}</p>
                    <p><strong>Issued:</strong> {transcriptData.issuedAt}</p>
                    <p><strong>Status:</strong> {transcriptData. isRevoked ? '❌ REVOKED' : '✅ Valid'}</p>
                    
                    <h4>Courses: </h4>
                    <table className="courses-table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Name</th>
                          <th>Credits</th>
                          <th>Grade</th>
                          <th>Year</th>
                          <th>Semester</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transcriptData. courses.map((course, index) => (
                          <tr key={index}>
                            <td>{course.courseCode}</td>
                            <td>{course. courseName}</td>
                            <td>{course.credits}</td>
                            <td>{course.grade}</td>
                            <td>{course.year}</td>
                            <td>{course.semester}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <button onClick={() => verifyTranscript(transcriptData.id)} disabled={loading}>
                      Verify Transcript
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="section">
              <h2>My Transcripts</h2>
              <button onClick={getMyTranscripts} disabled={loading}>
                {loading ? 'Loading...' : 'Get My Transcripts'}
              </button>

              {studentTranscripts.length > 0 && (
                <div className="transcripts-list">
                  {studentTranscripts.map((transcript) => (
                    <div key={transcript.id} className={`transcript-item ${transcript.isRevoked ? 'revoked' : ''}`}>
                      <h4>Transcript #{transcript.id}</h4>
                      <p><strong>Institution:</strong> {transcript.institutionName}</p>
                      <p><strong>Program:</strong> {transcript.program}</p>
                      <p><strong>Courses:</strong> {transcript.coursesCount}</p>
                      <p><strong>Issued:</strong> {transcript.issuedAt}</p>
                      <p><strong>Status:</strong> {transcript.isRevoked ? '❌ REVOKED' : '✅ Valid'}</p>
                      <button onClick={() => {
                        setSearchTranscriptId(transcript.id);
                        searchTranscript();
                      }}>
                        View Details
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;